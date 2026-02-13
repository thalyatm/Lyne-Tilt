import { Hono } from 'hono';
import { eq, desc, sql, and } from 'drizzle-orm';
import { emailAutomations, automationQueue } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import { triggerAutomation } from '../utils/automations';
import type { Bindings, Variables } from '../index';

export const automationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list all automations
automationsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const result = await db.select().from(emailAutomations).orderBy(desc(emailAutomations.createdAt)).all();
  return c.json(result);
});

// GET /queue/stats — counts by status (must be before /:id)
automationsRoutes.get('/queue/stats', adminAuth, async (c) => {
  const db = c.get('db');
  const stats = await db.select({
    status: automationQueue.status,
    count: sql<number>`COUNT(*)`,
  }).from(automationQueue).groupBy(automationQueue.status).all();

  const result = { scheduled: 0, sent: 0, failed: 0, cancelled: 0 };
  for (const row of stats) {
    if (row.status in result) result[row.status as keyof typeof result] = row.count;
  }
  return c.json(result);
});

// GET /queue — list queue items
automationsRoutes.get('/queue', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');
  const automationId = c.req.query('automationId');

  let result;
  const conditions = [];
  if (status) conditions.push(eq(automationQueue.status, status as any));
  if (automationId) conditions.push(eq(automationQueue.automationId, automationId));

  if (conditions.length > 0) {
    result = await db.select().from(automationQueue).where(and(...conditions)).orderBy(desc(automationQueue.createdAt)).all();
  } else {
    result = await db.select().from(automationQueue).orderBy(desc(automationQueue.createdAt)).all();
  }
  return c.json(result);
});

// GET /queue/all — alias for /queue (frontend calls this path)
automationsRoutes.get('/queue/all', adminAuth, async (c) => {
  const db = c.get('db');
  const result = await db.select().from(automationQueue).orderBy(desc(automationQueue.createdAt)).all();
  return c.json(result);
});

// POST /queue/process — stub (actual processing done by scheduled worker)
automationsRoutes.post('/queue/process', adminAuth, async (c) => {
  return c.json({ processed: 0, sent: 0, failed: 0 });
});

// POST /queue/:id/retry — reset failed item to scheduled
automationsRoutes.post('/queue/:id/retry', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const item = await db.select().from(automationQueue).where(eq(automationQueue.id, id)).get();
  if (!item) return c.json({ error: 'Queue item not found' }, 404);
  if (item.status !== 'failed') return c.json({ error: 'Only failed items can be retried' }, 400);
  if ((item.retryCount ?? 0) >= (item.maxRetries ?? 3)) {
    return c.json({ error: 'Max retries exceeded' }, 400);
  }

  const updated = await db.update(automationQueue)
    .set({ status: 'scheduled', error: null })
    .where(eq(automationQueue.id, id))
    .returning().get();

  return c.json(updated);
});

// DELETE /queue/:id — cancel a scheduled queue item
automationsRoutes.delete('/queue/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const item = await db.select().from(automationQueue).where(eq(automationQueue.id, id)).get();
  if (!item) return c.json({ error: 'Queue item not found' }, 404);
  if (item.status !== 'scheduled') return c.json({ error: 'Only scheduled items can be cancelled' }, 400);

  const updated = await db.update(automationQueue)
    .set({ status: 'cancelled' })
    .where(eq(automationQueue.id, id))
    .returning().get();

  return c.json(updated);
});

// POST /seed — seed 4 system email automation templates
automationsRoutes.post('/seed', adminAuth, async (c) => {
  const db = c.get('db');
  const now = new Date().toISOString();

  const templates = getSystemTemplates(now);
  let seeded = 0;

  for (const tmpl of templates) {
    const existing = await db.select().from(emailAutomations).where(eq(emailAutomations.id, tmpl.id)).get();
    if (!existing) {
      await db.insert(emailAutomations).values(tmpl);
      seeded++;
    }
  }

  return c.json({ seeded, total: templates.length });
});

// GET /:id — get single automation
automationsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const result = await db.select().from(emailAutomations).where(eq(emailAutomations.id, id)).get();
  if (!result) return c.json({ error: 'Automation not found' }, 404);
  return c.json(result);
});

// POST / — create automation
automationsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { name, description, trigger, steps, subject, previewText, bodyText, bodyHtml, ctaLabel, ctaUrl, footerText, sendDelayDays, sendDelayHours, oneTimePerRecipient } = body;

  if (!name) return c.json({ error: 'name is required' }, 400);

  const result = await db.insert(emailAutomations).values({
    id: body.id || undefined,
    name,
    description: description || null,
    trigger: trigger || 'manual',
    steps: steps || [],
    subject: subject || null,
    previewText: previewText || null,
    bodyText: bodyText || null,
    bodyHtml: bodyHtml || null,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl || null,
    footerText: footerText || null,
    sendDelayDays: sendDelayDays ?? 0,
    sendDelayHours: sendDelayHours ?? 0,
    oneTimePerRecipient: oneTimePerRecipient ?? false,
    status: 'paused',
  }).returning().get();

  await logActivity(db, 'create', 'automation', result, c.get('user'));

  return c.json(result, 201);
});

// PUT /:id — update automation
automationsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  const fields = ['name', 'description', 'trigger', 'steps', 'subject', 'previewText', 'bodyText', 'bodyHtml', 'ctaLabel', 'ctaUrl', 'footerText', 'enabled', 'sendDelayDays', 'sendDelayHours', 'oneTimePerRecipient'];

  for (const field of fields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const result = await db.update(emailAutomations).set(updates).where(eq(emailAutomations.id, id)).returning().get();
  if (!result) return c.json({ error: 'Automation not found' }, 404);

  await logActivity(db, 'update', 'automation', result, c.get('user'));

  return c.json(result);
});

// PATCH /:id/status — toggle active/paused
automationsRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status } = await c.req.json();

  if (!status || !['active', 'paused'].includes(status)) {
    return c.json({ error: 'status must be "active" or "paused"' }, 400);
  }

  const result = await db.update(emailAutomations)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(emailAutomations.id, id))
    .returning().get();

  if (!result) return c.json({ error: 'Automation not found' }, 404);

  await logActivity(db, 'update', 'automation', result, c.get('user'));

  // When pausing, cancel all pending queue items
  if (status === 'paused') {
    await db.update(automationQueue)
      .set({ status: 'cancelled' })
      .where(and(
        eq(automationQueue.automationId, id),
        eq(automationQueue.status, 'scheduled')
      ));
  }

  return c.json(result);
});

// PATCH /:id/enabled — toggle enabled/disabled
automationsRoutes.patch('/:id/enabled', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { enabled } = await c.req.json();

  const result = await db.update(emailAutomations)
    .set({ enabled: !!enabled, updatedAt: new Date().toISOString() })
    .where(eq(emailAutomations.id, id))
    .returning().get();

  if (!result) return c.json({ error: 'Automation not found' }, 404);

  await logActivity(db, 'update', 'automation', result, c.get('user'));

  return c.json(result);
});

// DELETE /:id — delete automation
automationsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(emailAutomations).where(eq(emailAutomations.id, id)).get();
  await db.delete(emailAutomations).where(eq(emailAutomations.id, id));

  if (existing) {
    await logActivity(db, 'delete', 'automation', existing, c.get('user'));
  }

  return c.json({ success: true });
});

// POST /:id/trigger — manually trigger for a recipient email
automationsRoutes.post('/:id/trigger', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { email, name, context } = await c.req.json();

  if (!email) return c.json({ error: 'email is required' }, 400);

  const automation = await db.select().from(emailAutomations).where(eq(emailAutomations.id, id)).get();
  if (!automation) return c.json({ error: 'Automation not found' }, 404);

  await triggerAutomation(db, automation.trigger, email, name, context);

  const steps = (automation.steps || []) as any[];
  const queued = automation.subject ? 1 : steps.length;
  return c.json({ success: true, stepsQueued: queued });
});

// ============================================
// Seed template data
// ============================================

function getSystemTemplates(now: string) {
  return [
    {
      id: 'inquiry-received',
      name: 'Inquiry Received',
      description: 'Sent immediately when a form submission is received',
      trigger: 'form_submission_received' as const,
      status: 'active' as const,
      subject: 'Thank you for your response \u2709\uFE0F',
      previewText: "I've received your message and will reply within 24 to 48 hours.",
      bodyText: `Hi there,

Thank you for getting in touch. I've received your response and will reply within 24 to 48 hours.

In the meantime, you're welcome to browse the FAQs below or visit the store.

Frequently Asked Questions

What happens next after I submit my inquiry?
Once your inquiry is received, a member of our team will review the details and contact you to discuss what you need. We will guide you through the next steps and provide any helpful information along the way.

Can I update my inquiry after submitting?
Yes. If you would like to add or change anything, simply reply to this email with the updates.

What payment methods do you accept?
We accept major credit cards including Visa, MasterCard, and American Express, along with PayPal, Apple Pay, and Google Pay.

Warmly,
Lyne x`,
      bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:40px 32px;">
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hi there,</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Thank you for getting in touch. I've received your response and will reply within 24 to 48 hours.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">In the meantime, you're welcome to browse the FAQs below or visit the store.</p>
<h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1c1917;">Frequently Asked Questions</h2>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;line-height:1.5;">What happens next after I submit my inquiry?</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#44403c;">Once your inquiry is received, a member of our team will review the details and contact you to discuss what you need. We will guide you through the next steps and provide any helpful information along the way.</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;line-height:1.5;">Can I update my inquiry after submitting?</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#44403c;">Yes. If you would like to add or change anything, simply reply to this email with the updates.</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;line-height:1.5;">What payment methods do you accept?</p>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#44403c;">We accept major credit cards including Visa, MasterCard, and American Express, along with PayPal, Apple Pay, and Google Pay.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background-color:#b45309;border-radius:6px;padding:12px 28px;">
<a href="{{cta_url}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">View Store</a>
</td></tr></table>
<p style="margin:0 0 4px;font-size:16px;line-height:1.6;">Warmly,</p>
<p style="margin:0;font-size:16px;line-height:1.6;">Lyne x</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#fafaf9;text-align:center;border-top:1px solid #e7e5e4;">
<p style="margin:0;color:#78716c;font-size:12px;line-height:1.5;">1/374 Brunswick Street, Fortitude Valley, Australia</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`,
      ctaLabel: 'View Store',
      ctaUrl: '{{cta_url}}',
      footerText: '1/374 Brunswick Street, Fortitude Valley, Australia',
      enabled: true,
      sendDelayDays: 0,
      sendDelayHours: 0,
      isSystem: true,
      oneTimePerRecipient: false,
      steps: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'order-confirmation',
      name: 'Order Confirmation',
      description: 'Sent immediately when an order is placed',
      trigger: 'order_placed' as const,
      status: 'active' as const,
      subject: 'Thank you for your order',
      previewText: 'Your order is confirmed. I will keep you updated as it moves.',
      bodyText: `Hi lovely,

Thank you for your support. It truly means the world to this little studio.

About your order

Please allow up to 7 working days for us to process and pack your order with care.

As soon as it has been shipped, we will send you a tracking number so you can follow its journey to you.

If you have any questions at all, simply reply to this email. I am here.

Much kindness,
Lyne x`,
      bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:40px 32px;">
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hi lovely,</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Thank you for your support. It truly means the world to this little studio.</p>
<h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1c1917;">About your order</h2>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Please allow up to 7 working days for us to process and pack your order with care.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">As soon as it has been shipped, we will send you a tracking number so you can follow its journey to you.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;">If you have any questions at all, simply reply to this email. I am here.</p>
<p style="margin:0 0 4px;font-size:16px;line-height:1.6;">Much kindness,</p>
<p style="margin:0;font-size:16px;line-height:1.6;">Lyne x</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#fafaf9;text-align:center;border-top:1px solid #e7e5e4;">
<p style="margin:0 0 4px;color:#78716c;font-size:12px;line-height:1.5;">1/374 Brunswick Street, Fortitude Valley, Australia</p>
<p style="margin:0 0 4px;color:#78716c;font-size:12px;line-height:1.5;">Powered by Squarespace</p>
<p style="margin:0;"><a href="{{unsubscribe_url}}" style="color:#78716c;font-size:12px;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`,
      ctaLabel: null,
      ctaUrl: null,
      footerText: '1/374 Brunswick Street, Fortitude Valley, Australia\nPowered by Squarespace\nUnsubscribe',
      enabled: true,
      sendDelayDays: 0,
      sendDelayHours: 0,
      isSystem: true,
      oneTimePerRecipient: false,
      steps: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'review-request',
      name: 'Post Purchase Review Request',
      description: 'Sent 7 days after order fulfillment or delivery',
      trigger: 'order_fulfilled_or_delivered' as const,
      status: 'active' as const,
      subject: 'Rate your order from Lyne Tilt Studio',
      previewText: 'If you have a moment, I would love to hear how it felt.',
      bodyText: `Hi there,

Thank you again for shopping with Lyne Tilt Studio. I hope your order has arrived beautifully.

If you have a moment to share your experience, your review helps more than you know. It only takes a few clicks and supports this studio deeply.

Your order details are included below for reference.

Product Name: {{product_name}}
Variant: {{variant}}
Size: {{size}}
Colour: {{color}}

Warmly,
Lyne x`,
      bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:40px 32px;">
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hi there,</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Thank you again for shopping with Lyne Tilt Studio. I hope your order has arrived beautifully.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;">If you have a moment to share your experience, your review helps more than you know. It only takes a few clicks and supports this studio deeply.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background-color:#b45309;border-radius:6px;padding:12px 28px;">
<a href="{{cta_url}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">Write Review</a>
</td></tr></table>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Your order details are included below for reference.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin:0 0 28px;">
<tr style="border-bottom:1px solid #e7e5e4;"><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Product Name</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{product_name}}</td></tr>
<tr style="border-bottom:1px solid #e7e5e4;"><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Variant</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{variant}}</td></tr>
<tr style="border-bottom:1px solid #e7e5e4;"><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Size</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{size}}</td></tr>
<tr><td style="font-size:14px;color:#78716c;padding:10px 14px;">Colour</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;">{{color}}</td></tr>
</table>
<p style="margin:0 0 4px;font-size:16px;line-height:1.6;">Warmly,</p>
<p style="margin:0;font-size:16px;line-height:1.6;">Lyne x</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`,
      ctaLabel: 'Write Review',
      ctaUrl: '{{cta_url}}',
      footerText: null,
      enabled: true,
      sendDelayDays: 7,
      sendDelayHours: 0,
      isSystem: true,
      oneTimePerRecipient: false,
      steps: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'abandoned-cart',
      name: 'Abandoned Cart Reminder',
      description: 'Sent 2 hours after cart abandonment, one time only per recipient',
      trigger: 'cart_abandoned' as const,
      status: 'active' as const,
      subject: 'Lyne Tilt Studio: Your Cart is Waiting',
      previewText: 'Just a gentle reminder. Your items are still saved.',
      bodyText: `Hi there,

It looks like you did not get a chance to finish your order.

For your convenience, your selected items are still saved in your cart.

If you would like to complete your purchase, you can continue below.

Product Name: {{product_name}}
Price: {{price}}
Variant: {{variant}}
Qty: {{qty}}

This is a one time reminder about this cart.
Unsubscribe from cart reminders.`,
      bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:40px 32px;">
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hi there,</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">It looks like you did not get a chance to finish your order.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;">For your convenience, your selected items are still saved in your cart.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;">If you would like to complete your purchase, you can continue below.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background-color:#b45309;border-radius:6px;padding:12px 28px;">
<a href="{{cart_recovery_url}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">Complete Your Order</a>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin:0 0 28px;">
<tr><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Product Name</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{product_name}}</td></tr>
<tr><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Price</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{price}}</td></tr>
<tr><td style="font-size:14px;color:#78716c;padding:10px 14px;border-bottom:1px solid #e7e5e4;">Variant</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;border-bottom:1px solid #e7e5e4;">{{variant}}</td></tr>
<tr><td style="font-size:14px;color:#78716c;padding:10px 14px;">Qty</td><td style="font-size:14px;color:#1c1917;padding:10px 14px;">{{qty}}</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:#78716c;line-height:1.5;">This is a one time reminder about this cart.</p>
<p style="margin:0;font-size:13px;"><a href="{{unsubscribe_url}}" style="color:#78716c;text-decoration:underline;">Unsubscribe from cart reminders.</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`,
      ctaLabel: 'Complete Your Order',
      ctaUrl: '{{cart_recovery_url}}',
      footerText: null,
      enabled: true,
      sendDelayDays: 0,
      sendDelayHours: 2,
      isSystem: true,
      oneTimePerRecipient: true,
      steps: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}
