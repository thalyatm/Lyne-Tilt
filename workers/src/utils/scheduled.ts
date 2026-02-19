import { eq, and, lte, isNotNull, sql } from 'drizzle-orm';
import { emailDrafts, sentEmails, subscribers, automationQueue, abandonedCarts, abandonedCartItems } from '../db/schema';
import { sendEmail, sendBulkNewsletter } from './email';
import { triggerAutomation } from './automations';
import type { Bindings } from '../index';

type DB = any;

export async function processScheduledDrafts(env: Bindings, db: DB) {
  const now = new Date().toISOString();

  // Find drafts that are due
  const dueDrafts = await db.select().from(emailDrafts)
    .where(and(
      isNotNull(emailDrafts.scheduledFor),
      lte(emailDrafts.scheduledFor, now)
    ))
    .all();

  console.log(`[Cron] Found ${dueDrafts.length} scheduled draft(s) to process`);

  for (const draft of dueDrafts) {
    try {
      // Query active subscribers matching audience/segment
      let recipientList = await db.select().from(subscribers)
        .where(eq(subscribers.subscribed, true))
        .all();

      if (draft.audience === 'segment' && draft.segmentFilters) {
        const filters = typeof draft.segmentFilters === 'string'
          ? JSON.parse(draft.segmentFilters)
          : draft.segmentFilters;
        const { sources, tags } = filters as { sources?: string[]; tags?: string[] };
        if (sources && sources.length > 0) {
          recipientList = recipientList.filter((s: any) => sources.includes(s.source || ''));
        }
        if (tags && tags.length > 0) {
          recipientList = recipientList.filter((s: any) => {
            const subTags = (s.tags || []) as string[];
            return tags.some((t: string) => subTags.includes(t));
          });
        }
      }

      if (recipientList.length === 0) {
        console.log(`[Cron] No recipients for draft "${draft.subject}", deleting`);
        await db.delete(emailDrafts).where(eq(emailDrafts.id, draft.id));
        continue;
      }

      const recipientEmails = recipientList.map((s: any) => s.email);

      // Create sentEmails record
      const sentRecord = await db.insert(sentEmails).values({
        subject: draft.subject,
        preheader: draft.preheader || null,
        body: draft.body || '',
        bodyHtml: draft.bodyHtml || '',
        recipientCount: recipientEmails.length,
        recipientEmails,
        audience: draft.audience || 'all',
        segmentFilters: draft.segmentFilters || null,
      }).returning().get();

      // Send emails
      const baseUrl = env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
      const bodyHtml = draft.bodyHtml || draft.body || '';
      await sendBulkNewsletter(env, sentRecord.id, draft.subject, draft.preheader, bodyHtml, recipientEmails, baseUrl);

      // Update subscribers
      const timestamp = new Date().toISOString();
      for (const email of recipientEmails) {
        await db.update(subscribers)
          .set({
            lastEmailedAt: timestamp,
            emailsReceived: sql`COALESCE(${subscribers.emailsReceived}, 0) + 1`,
            updatedAt: timestamp,
          })
          .where(eq(subscribers.email, email));
      }

      // Delete the draft
      await db.delete(emailDrafts).where(eq(emailDrafts.id, draft.id));

      console.log(`[Cron] Sent scheduled draft "${draft.subject}" to ${recipientEmails.length} recipients`);
    } catch (err) {
      console.error(`[Cron] Error processing draft ${draft.id}:`, err);
    }
  }
}

export async function processAutomationQueue(env: Bindings, db: DB) {
  const now = new Date().toISOString();

  // Find queue items that are due
  const dueItems = await db.select().from(automationQueue)
    .where(and(
      eq(automationQueue.status, 'scheduled'),
      lte(automationQueue.scheduledFor, now)
    ))
    .all();

  console.log(`[Cron] Found ${dueItems.length} automation queue item(s) to process`);

  for (const item of dueItems) {
    try {
      await sendEmail(env, item.recipientEmail, item.subject, item.body);

      await db.update(automationQueue)
        .set({
          status: 'sent',
          sentAt: new Date().toISOString(),
        })
        .where(eq(automationQueue.id, item.id));

      console.log(`[Cron] Sent automation email "${item.subject}" to ${item.recipientEmail}`);
    } catch (err: any) {
      console.error(`[Cron] Failed automation email ${item.id}:`, err);

      await db.update(automationQueue)
        .set({
          status: 'failed',
          error: err?.message || 'Unknown error',
        })
        .where(eq(automationQueue.id, item.id));
    }
  }
}

export async function processAbandonedCarts(env: Bindings, db: DB) {
  // Find carts that:
  // 1. Have status = 'abandoned'
  // 2. Have an email
  // 3. lastActivityAt is more than 2 hours ago
  // 4. emailSentAt is NULL (haven't been emailed yet)
  // OR emailCount < 3 and last email was > 24 hours ago (for follow-up emails)

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const eligibleCarts = await db.select().from(abandonedCarts)
    .where(and(
      eq(abandonedCarts.status, 'abandoned'),
      isNotNull(abandonedCarts.email),
      lte(abandonedCarts.lastActivityAt, twoHoursAgo),
      // First email only (emailSentAt is null)
      sql`${abandonedCarts.emailSentAt} IS NULL`,
    ))
    .all();

  console.log(`[Cron] Found ${eligibleCarts.length} abandoned cart(s) to email`);

  const baseUrl = env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';

  for (const cart of eligibleCarts) {
    try {
      // Get cart items for context
      const items = await db.select().from(abandonedCartItems)
        .where(eq(abandonedCartItems.cartId, cart.id))
        .all();

      if (items.length === 0) continue;

      const firstItem = items[0];
      const recoveryUrl = `${baseUrl}/#/checkout?recover=${cart.recoveryToken}`;

      const queued = await triggerAutomation(db, 'cart_abandoned', cart.email, cart.customerName || undefined, {
        cart_recovery_url: recoveryUrl,
        product_name: firstItem.productName,
        price: cart.totalValue,
        qty: String(cart.itemCount),
      });

      // If no automation configured, send direct email
      if (!queued) {
        const customerName = cart.customerName || 'there';
        await sendEmail(
          env,
          cart.email,
          `You left something behind — ${firstItem.productName}`,
          `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">Hi ${customerName},</h1>
            <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
              It looks like you left something in your cart: <strong>${firstItem.productName}</strong>
            </p>
            <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
              Each piece is one-of-a-kind, and I'd hate for you to miss out.
            </p>
            <a href="${recoveryUrl}" style="display: inline-block; background: #8d3038; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 16px;">
              Complete Your Order
            </a>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 32px;">
              If you have any questions, feel free to reply to this email.
            </p>
          </div>`
        );
      }

      // Mark as emailed
      await db.update(abandonedCarts)
        .set({
          emailSentAt: new Date().toISOString(),
          emailCount: sql`${abandonedCarts.emailCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(abandonedCarts.id, cart.id));

      console.log(`[Cron] Queued abandoned cart email for ${cart.email}`);
    } catch (err) {
      console.error(`[Cron] Error processing abandoned cart ${cart.id}:`, err);
    }
  }

  // Also expire old carts (older than 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.update(abandonedCarts)
    .set({ status: 'expired', updatedAt: new Date().toISOString() })
    .where(and(
      eq(abandonedCarts.status, 'abandoned'),
      lte(abandonedCarts.lastActivityAt, thirtyDaysAgo),
    ));
}
