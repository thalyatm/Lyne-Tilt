import { Hono } from 'hono';
import { eq, desc, and, sql } from 'drizzle-orm';
import { campaigns, campaignEvents, subscribers } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { logActivity } from '../utils/activityLog';
import type { Bindings, Variables } from '../index';

export const campaignsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── GET / — List campaigns ──────────────────────────────
campaignsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');

  const conditions = status ? eq(campaigns.status, status as any) : undefined;

  const rows = await db
    .select()
    .from(campaigns)
    .where(conditions)
    .orderBy(desc(campaigns.updatedAt))
    .all();

  return c.json({ campaigns: rows });
});

// ─── POST / — Create campaign ────────────────────────────
campaignsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');

  const result = await db.insert(campaigns).values({
    subject: body.subject || 'Untitled Campaign',
    preheader: body.preheader || null,
    body: body.body || '[]',
    bodyHtml: body.bodyHtml || null,
    audience: body.audience || 'all',
    segmentId: body.segmentId || null,
    segmentFilters: body.segmentFilters || null,
    createdBy: user?.id,
  }).returning().get();

  await logActivity(db, 'create', 'campaign', result, user);
  return c.json(result, 201);
});

// ─── GET /:id — Get single campaign ─────────────────────
campaignsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  return c.json(campaign);
});

// ─── PUT /:id — Update campaign ─────────────────────────
campaignsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user');

  const existing = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  const result = await db.update(campaigns)
    .set({
      subject: body.subject ?? existing.subject,
      preheader: body.preheader !== undefined ? body.preheader : existing.preheader,
      body: body.body ?? existing.body,
      bodyHtml: body.bodyHtml !== undefined ? body.bodyHtml : existing.bodyHtml,
      audience: body.audience ?? existing.audience,
      segmentId: body.segmentId !== undefined ? body.segmentId : existing.segmentId,
      segmentFilters: body.segmentFilters !== undefined ? body.segmentFilters : existing.segmentFilters,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(campaigns.id, id))
    .returning()
    .get();

  return c.json(result);
});

// ─── DELETE /:id — Delete campaign ──────────────────────
campaignsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  await db.delete(campaigns).where(eq(campaigns.id, id));
  await logActivity(db, 'delete', 'campaign', existing, user);

  return c.json({ success: true });
});

// ─── POST /preview-recipients — Count matching subscribers ─
campaignsRoutes.post('/preview-recipients', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  // Get all active subscribers with source and tags
  const allSubscribers = await db
    .select({ id: subscribers.id, source: subscribers.source, tags: subscribers.tags })
    .from(subscribers)
    .where(eq(subscribers.subscribed, true))
    .all();

  const availableSources = [...new Set(allSubscribers.map(s => s.source).filter(Boolean))] as string[];
  const allTagArrays = allSubscribers.map(s => (s.tags as string[]) || []);
  const availableTagsList = [...new Set(allTagArrays.flat().filter(Boolean))];

  let count = allSubscribers.length;

  if (body.audience === 'segment' && body.segmentFilters) {
    const filters = body.segmentFilters;
    let filtered = allSubscribers;

    if (filters.sources?.length) {
      const sourceSet = new Set(filters.sources);
      filtered = filtered.filter(s => s.source && sourceSet.has(s.source));
    }

    if (filters.tags?.length) {
      const tagSet = new Set(filters.tags);
      filtered = filtered.filter(s => {
        const subTags = (s.tags as string[]) || [];
        return subTags.some(t => tagSet.has(t));
      });
    }

    count = filtered.length;
  }

  return c.json({
    count,
    availableSources,
    availableTags: availableTagsList,
  });
});

// ─── POST /:id/send-test — Send test email ─────────────
campaignsRoutes.post('/:id/send-test', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const email = body.email;

  if (!email) return c.json({ error: 'Email address required' }, 400);

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (!campaign.bodyHtml) return c.json({ error: 'Campaign has no HTML content' }, 400);

  // Send via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `Lyne Tilt <${c.env.ADMIN_EMAIL}>`,
      to: [email],
      subject: `[TEST] ${campaign.subject}`,
      html: campaign.bodyHtml,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error('Resend test email error:', err);
    return c.json({ error: 'Failed to send test email' }, 500);
  }

  // Track that a test was sent
  await db.update(campaigns)
    .set({
      testSentTo: [...(campaign.testSentTo || []), email],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(campaigns.id, id));

  return c.json({ success: true });
});

// ─── GET /:id/preflight — Pre-send checklist ────────────
campaignsRoutes.get('/:id/preflight', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  const hasSubject = !!campaign.subject && campaign.subject !== 'Untitled Campaign';
  const hasContent = !!campaign.bodyHtml && campaign.bodyHtml.length > 50;
  const hasUnsubscribeLink = !!campaign.bodyHtml && campaign.bodyHtml.toLowerCase().includes('unsubscribe');
  const testSent = !!(campaign.testSentTo && campaign.testSentTo.length > 0);
  const audienceSelected = campaign.audience === 'all' || !!campaign.segmentFilters;

  // Count recipients
  let recipientCount = 0;
  if (campaign.audience === 'all') {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .get();
    recipientCount = result?.count ?? 0;
  } else {
    // For segments, count filtered subscribers
    recipientCount = await countSegmentRecipients(db, campaign.segmentFilters);
  }

  const checks = { hasSubject, hasContent, hasUnsubscribeLink, testSent, audienceSelected };
  const allPassed = Object.values(checks).every(Boolean);

  return c.json({
    campaign: {
      id: campaign.id,
      subject: campaign.subject,
      preheader: campaign.preheader,
      bodyHtml: campaign.bodyHtml,
      audience: campaign.audience,
    },
    checks,
    allPassed,
    recipientCount,
  });
});

// ─── POST /:id/schedule — Schedule campaign ─────────────
campaignsRoutes.post('/:id/schedule', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user');

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'draft') return c.json({ error: 'Only draft campaigns can be scheduled' }, 400);

  const result = await db.update(campaigns)
    .set({
      status: 'scheduled',
      scheduledFor: body.scheduledFor,
      scheduledTimezone: body.timezone || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(campaigns.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'campaign', result, user);
  return c.json(result);
});

// ─── POST /:id/send — Send campaign now ─────────────────
campaignsRoutes.post('/:id/send', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (!['draft', 'scheduled'].includes(campaign.status)) {
    return c.json({ error: 'Campaign cannot be sent in its current status' }, 400);
  }
  if (!campaign.bodyHtml) return c.json({ error: 'Campaign has no HTML content' }, 400);

  // Mark as sending
  await db.update(campaigns)
    .set({ status: 'sending', updatedAt: new Date().toISOString() })
    .where(eq(campaigns.id, id));

  // Get recipients
  let recipientEmails: { email: string; subscriberId: string }[];
  if (campaign.audience === 'all') {
    const subs = await db.select({ id: subscribers.id, email: subscribers.email })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .all();
    recipientEmails = subs.map(s => ({ email: s.email, subscriberId: s.id }));
  } else {
    recipientEmails = await getSegmentRecipients(db, campaign.segmentFilters);
  }

  let successCount = 0;
  const batchSize = 50;

  for (let i = 0; i < recipientEmails.length; i += batchSize) {
    const batch = recipientEmails.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `Lyne Tilt <${c.env.ADMIN_EMAIL}>`,
            to: [recipient.email],
            subject: campaign.subject,
            html: campaign.bodyHtml,
          }),
        });
        if (res.ok) {
          successCount++;
          await db.insert(campaignEvents).values({
            campaignId: id,
            subscriberId: recipient.subscriberId,
            email: recipient.email,
            eventType: 'delivered',
          });
        }
      })
    );
  }

  // Mark as sent
  const now = new Date().toISOString();
  const result = await db.update(campaigns)
    .set({
      status: 'sent',
      sentAt: now,
      recipientCount: recipientEmails.length,
      deliveredCount: successCount,
      recipientSnapshot: recipientEmails,
      updatedAt: now,
    })
    .where(eq(campaigns.id, id))
    .returning()
    .get();

  await logActivity(db, 'send', 'campaign', result, user);
  return c.json({ success: true, recipientCount: recipientEmails.length, delivered: successCount });
});

// ─── GET /:id/analytics — Campaign analytics ────────────
campaignsRoutes.get('/:id/analytics', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  // Event counts by type
  const eventCounts = await db.select({
    eventType: campaignEvents.eventType,
    count: sql<number>`count(*)`,
  })
    .from(campaignEvents)
    .where(eq(campaignEvents.campaignId, id))
    .groupBy(campaignEvents.eventType)
    .all();

  const countMap: Record<string, number> = {};
  for (const row of eventCounts) {
    countMap[row.eventType] = row.count;
  }

  const delivered = countMap['delivered'] || 0;
  const opened = countMap['opened'] || 0;
  const clicked = countMap['clicked'] || 0;
  const bounced = countMap['bounced'] || 0;
  const complained = countMap['complained'] || 0;
  const unsubscribed = countMap['unsubscribed'] || 0;

  // Timeline: group by hour since sentAt
  const timeline = campaign.sentAt
    ? await db.select({
        hour: sql<string>`strftime('%Y-%m-%d %H:00', ${campaignEvents.createdAt})`,
        opens: sql<number>`SUM(CASE WHEN ${campaignEvents.eventType} = 'opened' THEN 1 ELSE 0 END)`,
        clicks: sql<number>`SUM(CASE WHEN ${campaignEvents.eventType} = 'clicked' THEN 1 ELSE 0 END)`,
      })
        .from(campaignEvents)
        .where(eq(campaignEvents.campaignId, id))
        .groupBy(sql`strftime('%Y-%m-%d %H:00', ${campaignEvents.createdAt})`)
        .orderBy(sql`1`)
        .all()
    : [];

  // Click breakdown by URL
  const clickBreakdown = await db.select({
    url: sql<string>`json_extract(${campaignEvents.metadata}, '$.url')`,
    clicks: sql<number>`count(*)`,
    uniqueClicks: sql<number>`COUNT(DISTINCT ${campaignEvents.email})`,
  })
    .from(campaignEvents)
    .where(and(
      eq(campaignEvents.campaignId, id),
      eq(campaignEvents.eventType, 'clicked'),
    ))
    .groupBy(sql`json_extract(${campaignEvents.metadata}, '$.url')`)
    .orderBy(sql`2 DESC`)
    .all();

  // Recent events
  const recentEvents = await db.select()
    .from(campaignEvents)
    .where(eq(campaignEvents.campaignId, id))
    .orderBy(desc(campaignEvents.createdAt))
    .limit(50)
    .all();

  return c.json({
    campaign: {
      id: campaign.id,
      subject: campaign.subject,
      status: campaign.status,
      sentAt: campaign.sentAt,
      recipientCount: campaign.recipientCount ?? 0,
    },
    summary: {
      delivered,
      opened,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clicked,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      bounced,
      complained,
      unsubscribed,
    },
    clickBreakdown: clickBreakdown.filter(r => r.url),
    timeline,
    recentEvents,
  });
});

// ─── Helpers ─────────────────────────────────────────────

async function countSegmentRecipients(db: any, segmentFilters: any): Promise<number> {
  const recipients = await getSegmentRecipients(db, segmentFilters);
  return recipients.length;
}

async function getSegmentRecipients(db: any, segmentFilters: any): Promise<{ email: string; subscriberId: string }[]> {
  if (!segmentFilters) return [];
  const subs = await db.select({ id: subscribers.id, email: subscribers.email, source: subscribers.source, tags: subscribers.tags })
    .from(subscribers)
    .where(eq(subscribers.subscribed, true))
    .all();

  let filtered = subs;
  if (segmentFilters.sources?.length) {
    const sourceSet = new Set(segmentFilters.sources);
    filtered = filtered.filter((s: any) => s.source && sourceSet.has(s.source));
  }
  if (segmentFilters.tags?.length) {
    const tagSet = new Set(segmentFilters.tags);
    filtered = filtered.filter((s: any) => {
      const subTags = (s.tags as string[]) || [];
      return subTags.some((t: string) => tagSet.has(t));
    });
  }
  return filtered.map((s: any) => ({ email: s.email, subscriberId: s.id }));
}
