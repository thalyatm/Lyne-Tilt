import { Hono } from 'hono';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { subscribers, emailDrafts, sentEmails, subscriberTags, emailEvents } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { sendEmail, sendBulkNewsletter } from '../utils/email';
import { triggerAutomation } from '../utils/automations';
import type { Bindings, Variables } from '../index';

export const newsletterRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/newsletter/subscribe - Public subscription
newsletterRoutes.post('/subscribe', async (c) => {
  const db = c.get('db');
  const { email, source } = await c.req.json();

  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  // Check if already subscribed
  const existing = await db.select().from(subscribers).where(eq(subscribers.email, email)).get();

  if (existing) {
    if (existing.subscribed) {
      return c.json({ error: 'Already subscribed' }, 400);
    }
    // Resubscribe
    await db.update(subscribers)
      .set({
        subscribed: true,
        subscribedAt: new Date().toISOString(),
        unsubscribedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscribers.id, existing.id));

    await triggerAutomation(db, 'newsletter_signup', email, undefined);

    return c.json({ success: true, resubscribed: true });
  }

  await db.insert(subscribers).values({
    email,
    source: source || 'website',
    subscribed: true,
  });

  await triggerAutomation(db, 'newsletter_signup', email, undefined);

  return c.json({ success: true }, 201);
});

// POST /api/newsletter/unsubscribe - Public unsubscription
newsletterRoutes.post('/unsubscribe', async (c) => {
  const db = c.get('db');
  const { email } = await c.req.json();

  await db.update(subscribers)
    .set({
      subscribed: false,
      unsubscribedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscribers.email, email));

  return c.json({ success: true });
});

// GET /api/newsletter/subscribers - List subscribers (admin only)
newsletterRoutes.get('/subscribers', adminAuth, async (c) => {
  const db = c.get('db');

  const result = await db.select().from(subscribers)
    .orderBy(desc(subscribers.subscribedAt))
    .all();

  return c.json(result);
});

// GET /api/newsletter/stats - Get stats (admin only)
newsletterRoutes.get('/stats', adminAuth, async (c) => {
  const db = c.get('db');

  const all = await db.select().from(subscribers).all();
  const subscribed = all.filter(s => s.subscribed);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newLast30 = all.filter(s => s.createdAt && s.createdAt >= thirtyDaysAgo);

  const sentCount = await db.select({ count: sql<number>`COUNT(*)` }).from(sentEmails).get();
  const draftsCount = await db.select({ count: sql<number>`COUNT(*)` }).from(emailDrafts).get();

  const subscribersBySource: Record<string, number> = {};
  for (const s of subscribed) {
    const src = s.source || 'unknown';
    subscribersBySource[src] = (subscribersBySource[src] || 0) + 1;
  }

  return c.json({
    total: all.length,
    subscribed: subscribed.length,
    unsubscribed: all.length - subscribed.length,
    totalSubscribers: subscribed.length,
    newSubscribersLast30Days: newLast30.length,
    totalEmailsSent: sentCount?.count ?? 0,
    draftsCount: draftsCount?.count ?? 0,
    subscribersBySource,
  });
});

// GET /api/newsletter/drafts - List email drafts (admin only)
newsletterRoutes.get('/drafts', adminAuth, async (c) => {
  const db = c.get('db');

  const result = await db.select().from(emailDrafts)
    .orderBy(desc(emailDrafts.updatedAt))
    .all();

  return c.json(result);
});

// POST /api/newsletter/drafts - Create email draft (admin only)
newsletterRoutes.post('/drafts', adminAuth, async (c) => {
  const db = c.get('db');
  const { subject, preheader, body, bodyHtml, audience, segmentFilters } = await c.req.json();

  if (!subject || !body) {
    return c.json({ error: 'subject and body are required' }, 400);
  }

  const draft = await db.insert(emailDrafts).values({
    subject,
    preheader: preheader || null,
    body,
    bodyHtml: bodyHtml || null,
    audience: audience || 'all',
    segmentFilters: segmentFilters || null,
  }).returning().get();

  return c.json(draft, 201);
});

// PUT /api/newsletter/drafts/:id - Update email draft (admin only)
newsletterRoutes.put('/drafts/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { subject, preheader, body, bodyHtml, audience, segmentFilters } = await c.req.json();

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (subject !== undefined) updates.subject = subject;
  if (preheader !== undefined) updates.preheader = preheader;
  if (body !== undefined) updates.body = body;
  if (bodyHtml !== undefined) updates.bodyHtml = bodyHtml;
  if (audience !== undefined) updates.audience = audience;
  if (segmentFilters !== undefined) updates.segmentFilters = segmentFilters;

  const result = await db.update(emailDrafts)
    .set(updates)
    .where(eq(emailDrafts.id, id))
    .returning()
    .get();

  if (!result) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  return c.json(result);
});

// DELETE /api/newsletter/drafts/:id - Delete email draft (admin only)
newsletterRoutes.delete('/drafts/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(emailDrafts).where(eq(emailDrafts.id, id));

  return c.json({ success: true });
});

// GET /api/newsletter/sent - List sent emails (admin only)
newsletterRoutes.get('/sent', adminAuth, async (c) => {
  const db = c.get('db');

  const result = await db.select().from(sentEmails)
    .orderBy(desc(sentEmails.sentAt))
    .all();

  return c.json(result);
});

// GET /api/newsletter/tags - List subscriber tags (admin only)
newsletterRoutes.get('/tags', adminAuth, async (c) => {
  const db = c.get('db');

  const result = await db.select().from(subscriberTags).all();

  return c.json(result);
});

// POST /api/newsletter/tags - Create subscriber tag (admin only)
newsletterRoutes.post('/tags', adminAuth, async (c) => {
  const db = c.get('db');
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const tag = await db.insert(subscriberTags).values({
    name,
    description: description || null,
  }).returning().get();

  return c.json(tag, 201);
});

// DELETE /api/newsletter/tags/:id - Delete subscriber tag (admin only)
newsletterRoutes.delete('/tags/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(subscriberTags).where(eq(subscriberTags.id, id));

  return c.json({ success: true });
});

// PUT /api/newsletter/subscribers/:id - Update subscriber (admin only)
newsletterRoutes.put('/subscribers/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { subscribed, tags, name } = await c.req.json();

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (subscribed !== undefined) {
    updates.subscribed = subscribed;
    if (subscribed === false) {
      updates.unsubscribedAt = new Date().toISOString();
    } else if (subscribed === true) {
      updates.unsubscribedAt = null;
      updates.subscribedAt = new Date().toISOString();
    }
  }
  if (tags !== undefined) updates.tags = tags;
  if (name !== undefined) updates.name = name;

  const result = await db.update(subscribers)
    .set(updates)
    .where(eq(subscribers.id, id))
    .returning()
    .get();

  if (!result) {
    return c.json({ error: 'Subscriber not found' }, 404);
  }

  return c.json(result);
});

// DELETE /api/newsletter/subscribers/:id - Delete subscriber (admin only)
newsletterRoutes.delete('/subscribers/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(subscribers).where(eq(subscribers.id, id));

  return c.json({ success: true });
});

// GET /api/newsletter/sent/:id - Get sent email details (admin only)
newsletterRoutes.get('/sent/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const sentEmail = await db.select().from(sentEmails).where(eq(sentEmails.id, id)).get();

  if (!sentEmail) {
    return c.json({ error: 'Sent email not found' }, 404);
  }

  return c.json(sentEmail);
});

// GET /api/newsletter/sent/:id/analytics - Get analytics for a sent email (admin only)
newsletterRoutes.get('/sent/:id/analytics', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  // Get the sent email record
  const sentEmail = await db.select().from(sentEmails).where(eq(sentEmails.id, id)).get();

  if (!sentEmail) {
    return c.json({ error: 'Sent email not found' }, 404);
  }

  const recipientCount = sentEmail.recipientCount;

  // Unique opens (count distinct subscriberEmail where eventType='open')
  const uniqueOpensResult = await db.select({
    count: sql<number>`COUNT(DISTINCT ${emailEvents.subscriberEmail})`,
  })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.sentEmailId, id),
        eq(emailEvents.eventType, 'open')
      )
    )
    .get();

  const uniqueOpens = uniqueOpensResult?.count ?? 0;

  // Unique clicks (count distinct subscriberEmail where eventType='click')
  const uniqueClicksResult = await db.select({
    count: sql<number>`COUNT(DISTINCT ${emailEvents.subscriberEmail})`,
  })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.sentEmailId, id),
        eq(emailEvents.eventType, 'click')
      )
    )
    .get();

  const uniqueClicks = uniqueClicksResult?.count ?? 0;

  // Open rate & click rate
  const openRate = recipientCount > 0 ? uniqueOpens / recipientCount : 0;
  const clickRate = recipientCount > 0 ? uniqueClicks / recipientCount : 0;

  // Per-link breakdown: group by linkUrl, count clicks per link
  const linkBreakdown = await db.select({
    linkUrl: emailEvents.linkUrl,
    linkIndex: emailEvents.linkIndex,
    clicks: sql<number>`COUNT(*)`,
    uniqueClicks: sql<number>`COUNT(DISTINCT ${emailEvents.subscriberEmail})`,
  })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.sentEmailId, id),
        eq(emailEvents.eventType, 'click')
      )
    )
    .groupBy(emailEvents.linkUrl, emailEvents.linkIndex)
    .orderBy(desc(sql`COUNT(*)`))
    .all();

  // Timeline: opens and clicks by day for the first 7 days after send
  const sentDate = new Date(sentEmail.sentAt);
  const endDate = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDateStr = endDate.toISOString();

  const timeline = await db.select({
    date: sql<string>`DATE(${emailEvents.createdAt})`,
    eventType: emailEvents.eventType,
    count: sql<number>`COUNT(*)`,
  })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.sentEmailId, id),
        lte(emailEvents.createdAt, endDateStr)
      )
    )
    .groupBy(sql`DATE(${emailEvents.createdAt})`, emailEvents.eventType)
    .orderBy(sql`DATE(${emailEvents.createdAt})`)
    .all();

  // Format timeline into a more useful structure
  const timelineByDay: Record<string, { opens: number; clicks: number }> = {};
  for (const row of timeline) {
    if (!timelineByDay[row.date]) {
      timelineByDay[row.date] = { opens: 0, clicks: 0 };
    }
    if (row.eventType === 'open') {
      timelineByDay[row.date].opens = row.count;
    } else if (row.eventType === 'click') {
      timelineByDay[row.date].clicks = row.count;
    }
  }

  return c.json({
    sentEmailId: id,
    subject: sentEmail.subject,
    sentAt: sentEmail.sentAt,
    recipientCount,
    uniqueOpens,
    uniqueClicks,
    openRate: Math.round(openRate * 10000) / 100, // percentage with 2 decimals
    clickRate: Math.round(clickRate * 10000) / 100,
    linkBreakdown,
    timeline: timelineByDay,
  });
});

// GET /api/newsletter/stats/growth - Subscriber count by day for the last 90 days (admin only)
newsletterRoutes.get('/stats/growth', adminAuth, async (c) => {
  const db = c.get('db');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Get subscribers added per day
  const growth = await db.select({
    date: sql<string>`DATE(${subscribers.createdAt})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(subscribers)
    .where(gte(subscribers.createdAt, ninetyDaysAgo))
    .groupBy(sql`DATE(${subscribers.createdAt})`)
    .orderBy(sql`DATE(${subscribers.createdAt})`)
    .all();

  // Also get running total - total subscribers up to 90 days ago as baseline
  const baselineResult = await db.select({
    count: sql<number>`COUNT(*)`,
  })
    .from(subscribers)
    .where(lte(subscribers.createdAt, ninetyDaysAgo))
    .get();

  const baseline = baselineResult?.count ?? 0;

  // Build cumulative growth data
  let cumulative = baseline;
  const growthData = growth.map((row) => {
    cumulative += row.count;
    return {
      date: row.date,
      newSubscribers: row.count,
      totalSubscribers: cumulative,
    };
  });

  return c.json({
    baseline,
    growth: growthData,
  });
});

// POST /api/newsletter/subscribers/import - Import subscribers (admin only)
newsletterRoutes.post('/subscribers/import', adminAuth, async (c) => {
  const db = c.get('db');
  const importData: Array<{ email: string; name?: string; source?: string; tags?: string[] }> = await c.req.json();

  if (!Array.isArray(importData)) {
    return c.json({ error: 'Request body must be a JSON array' }, 400);
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const item of importData) {
    if (!item.email) {
      skipped++;
      continue;
    }

    const email = item.email.toLowerCase().trim();

    // Check if subscriber already exists
    const existing = await db.select().from(subscribers).where(eq(subscribers.email, email)).get();

    if (existing) {
      // Update existing subscriber if new data provided
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      let hasUpdates = false;

      if (item.name && item.name !== existing.name) {
        updates.name = item.name;
        hasUpdates = true;
      }
      if (item.source && item.source !== existing.source) {
        updates.source = item.source;
        hasUpdates = true;
      }
      if (item.tags && JSON.stringify(item.tags) !== JSON.stringify(existing.tags)) {
        // Merge tags
        const existingTags = (existing.tags || []) as string[];
        const mergedTags = [...new Set([...existingTags, ...item.tags])];
        updates.tags = mergedTags;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await db.update(subscribers).set(updates).where(eq(subscribers.id, existing.id));
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Create new subscriber
      await db.insert(subscribers).values({
        email,
        name: item.name || null,
        source: item.source || 'import',
        tags: item.tags || [],
        subscribed: true,
      });
      added++;
    }
  }

  return c.json({ added, skipped, updated });
});

// POST /api/newsletter/preview-recipients - Preview recipient count for audience filters (admin only)
newsletterRoutes.post('/preview-recipients', adminAuth, async (c) => {
  const db = c.get('db');
  const { audience, segmentFilters } = await c.req.json();

  let result = await db.select().from(subscribers)
    .where(eq(subscribers.subscribed, true))
    .all();

  if (audience === 'segment' && segmentFilters) {
    const { sources, tags } = segmentFilters as { sources?: string[]; tags?: string[] };

    if (sources && sources.length > 0) {
      result = result.filter(s => sources.includes(s.source || ''));
    }
    if (tags && tags.length > 0) {
      result = result.filter(s => {
        const subTags = (s.tags || []) as string[];
        return tags.some(t => subTags.includes(t));
      });
    }
  }

  return c.json({ count: result.length });
});

// GET /api/newsletter/subscribers/export - Export subscribers as JSON (admin only)
newsletterRoutes.get('/subscribers/export', adminAuth, async (c) => {
  const db = c.get('db');

  const subscribedFilter = c.req.query('subscribed');
  const sourceFilter = c.req.query('source');
  const tagFilter = c.req.query('tag');

  let query = db.select().from(subscribers);

  const conditions = [];

  if (subscribedFilter !== undefined) {
    conditions.push(eq(subscribers.subscribed, subscribedFilter === 'true'));
  }
  if (sourceFilter) {
    conditions.push(eq(subscribers.source, sourceFilter));
  }

  let result;
  if (conditions.length > 0) {
    result = await query.where(and(...conditions)).orderBy(desc(subscribers.createdAt)).all();
  } else {
    result = await query.orderBy(desc(subscribers.createdAt)).all();
  }

  // Filter by tag in application layer (since tags are stored as JSON array)
  let filtered = result;
  if (tagFilter) {
    filtered = result.filter((s) => {
      const tags = (s.tags || []) as string[];
      return tags.includes(tagFilter);
    });
  }

  return c.json(filtered);
});

// POST /api/newsletter/send - Send newsletter to subscribers (admin only)
newsletterRoutes.post('/send', adminAuth, async (c) => {
  const db = c.get('db');
  const env = c.env;
  const { subject, preheader, body, bodyHtml, audience, segmentFilters, draftId } = await c.req.json();

  if (!subject || !bodyHtml) {
    return c.json({ error: 'subject and bodyHtml are required' }, 400);
  }

  // Query active subscribers matching audience/segment
  let recipientList = await db.select().from(subscribers)
    .where(eq(subscribers.subscribed, true))
    .all();

  if (audience === 'segment' && segmentFilters) {
    const { sources, tags } = segmentFilters as { sources?: string[]; tags?: string[] };
    if (sources && sources.length > 0) {
      recipientList = recipientList.filter(s => sources.includes(s.source || ''));
    }
    if (tags && tags.length > 0) {
      recipientList = recipientList.filter(s => {
        const subTags = (s.tags || []) as string[];
        return tags.some(t => subTags.includes(t));
      });
    }
  }

  if (recipientList.length === 0) {
    return c.json({ error: 'No subscribers match the audience filters' }, 400);
  }

  const recipientEmails = recipientList.map(s => s.email);

  // Create sentEmails record
  const sentRecord = await db.insert(sentEmails).values({
    subject,
    preheader: preheader || null,
    body: body || '',
    bodyHtml,
    recipientCount: recipientEmails.length,
    recipientEmails,
    audience: audience || 'all',
    segmentFilters: segmentFilters || null,
  }).returning().get();

  // Send via Resend
  const baseUrl = env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
  const result = await sendBulkNewsletter(env, sentRecord.id, subject, preheader, bodyHtml, recipientEmails, baseUrl);

  // Update subscribers' lastEmailedAt and emailsReceived
  const now = new Date().toISOString();
  for (const email of recipientEmails) {
    await db.update(subscribers)
      .set({
        lastEmailedAt: now,
        emailsReceived: sql`COALESCE(${subscribers.emailsReceived}, 0) + 1`,
        updatedAt: now,
      })
      .where(eq(subscribers.email, email));
  }

  // Delete draft if provided
  if (draftId) {
    await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));
  }

  return c.json({
    success: true,
    sentEmailId: sentRecord.id,
    recipientCount: recipientEmails.length,
    sent: result.sent,
    failed: result.failed,
  });
});

// POST /api/newsletter/send-test - Send test email (admin only)
newsletterRoutes.post('/send-test', adminAuth, async (c) => {
  const env = c.env;
  const { email, subject, bodyHtml } = await c.req.json();

  if (!email || !subject || !bodyHtml) {
    return c.json({ error: 'email, subject, and bodyHtml are required' }, 400);
  }

  try {
    await sendEmail(env, email, `[TEST] ${subject}`, bodyHtml);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to send test email' }, 500);
  }
});
