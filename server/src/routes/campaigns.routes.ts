import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { eq, desc, and, sql, inArray, not } from 'drizzle-orm';
import { db, campaigns, subscribers, emailEvents, suppressionList, subscriberTags, activityLog } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Lyne Tilt <hello@lynetilt.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// ============================================
// HELPERS
// ============================================

function filterSubscribersBySegment(
  subscriberList: any[],
  filters?: { sources?: string[]; tags?: string[]; match?: string; conditions?: any[] }
): any[] {
  if (!filters) return subscriberList;

  // Legacy filter format (sources + tags)
  if (filters.sources || filters.tags) {
    return subscriberList.filter(sub => {
      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(sub.source)) return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const subTags = (sub.tags || []) as string[];
        if (!filters.tags.some((t: string) => subTags.includes(t))) return false;
      }
      return true;
    });
  }

  return subscriberList;
}

async function getSuppressedEmails(): Promise<Set<string>> {
  const suppressed = await db.select({ email: suppressionList.email }).from(suppressionList);
  return new Set(suppressed.map(s => s.email.toLowerCase()));
}

function rewriteLinksForTracking(html: string, campaignId: string, subscriberEmail: string, baseUrl: string): string {
  let linkIndex = 0;
  let rewritten = html.replace(/<a\s([^>]*?)href=["']([^"']+)["']/gi, (match, prefix, url) => {
    if (url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('tel:')) return match;
    const trackUrl = `${baseUrl}/api/campaigns/track/click/${campaignId}/${linkIndex}?url=${encodeURIComponent(url)}&email=${encodeURIComponent(subscriberEmail)}`;
    linkIndex++;
    return `<a ${prefix}href="${trackUrl}"`;
  });

  // Replace {{unsubscribe_url}} placeholder
  const unsubscribeUrl = `${baseUrl}/api/campaigns/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;
  rewritten = rewritten.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

  // Inject tracking pixel before </body>
  const pixel = `<img src="${baseUrl}/api/campaigns/track/open/${campaignId}?email=${encodeURIComponent(subscriberEmail)}" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" alt="" />`;
  if (rewritten.includes('</body>')) {
    rewritten = rewritten.replace('</body>', `${pixel}</body>`);
  } else {
    rewritten += pixel;
  }

  return rewritten;
}

async function logActivity(action: string, entityType: string, entityId: string, entityName: string | null, userId: string | null, userName: string | null, details?: string, metadata?: any) {
  try {
    await db.insert(activityLog).values({
      action: action as any,
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      details,
      metadata,
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

// ============================================
// CAMPAIGN CRUD
// ============================================

// GET list all campaigns
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { status } = req.query;

  let query = db.select().from(campaigns).orderBy(desc(campaigns.updatedAt));

  if (status && status !== 'all') {
    const result = await db.select().from(campaigns)
      .where(eq(campaigns.status, status as any))
      .orderBy(desc(campaigns.updatedAt));
    return res.json(result);
  }

  const result = await query;
  res.json(result);
});

// GET single campaign
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (result.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(result[0]);
});

// POST create campaign
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { subject, preheader, body, bodyHtml, audience, segmentFilters } = req.body;
  const user = (req as any).user;

  const result = await db.insert(campaigns).values({
    subject: subject || 'Untitled Campaign',
    preheader: preheader || null,
    body: body || '[]',
    bodyHtml: bodyHtml || null,
    status: 'draft',
    audience: audience || 'all',
    segmentFilters: segmentFilters || null,
    createdBy: user?.id || null,
  }).returning();

  await logActivity('create', 'campaign', result[0].id, result[0].subject, user?.id, user?.name, 'Campaign created');

  res.status(201).json(result[0]);
});

// PUT update campaign (draft only)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject, preheader, body, bodyHtml, audience, segmentFilters, segmentId } = req.body;

  const existing = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Only allow editing drafts. Editing a scheduled campaign reverts it to draft.
  if (existing[0].status !== 'draft' && existing[0].status !== 'scheduled') {
    return res.status(400).json({ error: 'Only draft or scheduled campaigns can be edited' });
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (subject !== undefined) updateData.subject = subject;
  if (preheader !== undefined) updateData.preheader = preheader;
  if (body !== undefined) updateData.body = body;
  if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
  if (audience !== undefined) updateData.audience = audience;
  if (segmentFilters !== undefined) updateData.segmentFilters = segmentFilters;
  if (segmentId !== undefined) updateData.segmentId = segmentId;

  // If editing a scheduled campaign, revert to draft
  if (existing[0].status === 'scheduled') {
    updateData.status = 'draft';
    updateData.scheduledFor = null;
    updateData.scheduledTimezone = null;
  }

  const result = await db.update(campaigns)
    .set(updateData)
    .where(eq(campaigns.id, id))
    .returning();

  res.json(result[0]);
});

// DELETE campaign (draft only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const existing = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (existing[0].status !== 'draft') {
    return res.status(400).json({ error: 'Only draft campaigns can be deleted' });
  }

  await db.delete(campaigns).where(eq(campaigns.id, id));
  await logActivity('delete', 'campaign', id, existing[0].subject, user?.id, user?.name, 'Campaign deleted');

  res.json({ message: 'Campaign deleted' });
});

// ============================================
// PRE-FLIGHT CHECKLIST
// ============================================

router.get('/:id/preflight', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const c = campaign[0];

  const checks = {
    hasSubject: !!c.subject && c.subject.trim().length > 0,
    hasContent: (() => {
      try {
        const blocks = JSON.parse(c.body);
        return Array.isArray(blocks) && blocks.length > 0;
      } catch {
        return c.body.length > 10;
      }
    })(),
    hasUnsubscribeLink: !!(c.bodyHtml && c.bodyHtml.includes('unsubscribe')),
    testSent: !!(c.testSentTo && c.testSentTo.length > 0),
    audienceSelected: c.audience === 'all' || !!(c.segmentFilters || c.segmentId),
  };

  // Get recipient count
  let subscriberList = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));
  const suppressedEmails = await getSuppressedEmails();

  if (c.audience === 'segment' && c.segmentFilters) {
    subscriberList = filterSubscribersBySegment(subscriberList, c.segmentFilters);
  }

  // Filter out suppressed
  subscriberList = subscriberList.filter(s => !suppressedEmails.has(s.email.toLowerCase()));

  const allPassed = Object.values(checks).every(v => v === true);

  res.json({
    checks,
    allPassed,
    recipientCount: subscriberList.length,
    campaign: c,
  });
});

// ============================================
// SEND TEST EMAIL
// ============================================

router.post('/:id/send-test', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Test email address is required' });
  }

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const c = campaign[0];

  if (!resend) {
    console.log(`=== TEST EMAIL (No Resend key) ===`);
    console.log(`To: ${email}, Subject: ${c.subject}`);
  } else {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `[TEST] ${c.subject}`,
        html: c.bodyHtml || c.body,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
  }

  // Record the test send
  const existingTestSentTo = c.testSentTo || [];
  if (!existingTestSentTo.includes(email)) {
    await db.update(campaigns)
      .set({ testSentTo: [...existingTestSentTo, email], updatedAt: new Date() })
      .where(eq(campaigns.id, id));
  }

  res.json({ message: `Test email sent to ${email}` });
});

// ============================================
// SCHEDULE CAMPAIGN
// ============================================

router.post('/:id/schedule', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduledFor, timezone } = req.body;
  const user = (req as any).user;

  if (!scheduledFor) {
    return res.status(400).json({ error: 'Scheduled time is required' });
  }

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaign[0].status !== 'draft') {
    return res.status(400).json({ error: 'Only draft campaigns can be scheduled' });
  }

  const result = await db.update(campaigns)
    .set({
      status: 'scheduled',
      scheduledFor: new Date(scheduledFor),
      scheduledTimezone: timezone || 'Australia/Melbourne',
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning();

  await logActivity('schedule', 'campaign', id, campaign[0].subject, user?.id, user?.name, `Scheduled for ${scheduledFor}`, { scheduledFor, timezone });

  res.json(result[0]);
});

// POST cancel scheduled campaign
router.post('/:id/cancel-schedule', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaign[0].status !== 'scheduled') {
    return res.status(400).json({ error: 'Only scheduled campaigns can be canceled' });
  }

  const result = await db.update(campaigns)
    .set({
      status: 'draft',
      scheduledFor: null,
      scheduledTimezone: null,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning();

  await logActivity('cancel_schedule' as any, 'campaign', id, campaign[0].subject, user?.id, user?.name, 'Schedule canceled');

  res.json(result[0]);
});

// ============================================
// SEND CAMPAIGN
// ============================================

router.post('/:id/send', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const c = campaign[0];

  if (c.status !== 'draft' && c.status !== 'scheduled') {
    return res.status(400).json({ error: 'Campaign has already been sent or is currently sending' });
  }

  // Get recipients
  let subscriberList = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));
  const suppressedEmails = await getSuppressedEmails();

  if (c.audience === 'segment' && c.segmentFilters) {
    subscriberList = filterSubscribersBySegment(subscriberList, c.segmentFilters);
  }

  // Filter out suppressed
  subscriberList = subscriberList.filter(s => !suppressedEmails.has(s.email.toLowerCase()));

  if (subscriberList.length === 0) {
    return res.status(400).json({ error: 'No eligible recipients' });
  }

  // Snapshot recipients and mark as sending
  const recipientSnapshot = subscriberList.map(s => ({ email: s.email, subscriberId: s.id }));
  await db.update(campaigns)
    .set({
      status: 'sending',
      recipientCount: subscriberList.length,
      recipientSnapshot,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id));

  // Send emails
  const htmlContent = c.bodyHtml || c.body;
  let sent = 0;
  let failed = 0;

  // Inject preheader if provided
  let htmlWithPreheader = htmlContent;
  if (c.preheader) {
    const preheaderHtml = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${c.preheader}</div>`;
    if (htmlWithPreheader.includes('<body')) {
      htmlWithPreheader = htmlWithPreheader.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
    } else {
      htmlWithPreheader = preheaderHtml + htmlWithPreheader;
    }
  }

  if (!resend) {
    console.log(`=== CAMPAIGN SEND (No Resend key) === To: ${subscriberList.length} subscribers, Subject: ${c.subject}`);
    sent = subscriberList.length;
  } else {
    for (const sub of subscriberList) {
      try {
        const personalizedHtml = rewriteLinksForTracking(htmlWithPreheader, id, sub.email, FRONTEND_URL);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: sub.email,
          subject: c.subject,
          html: personalizedHtml,
          headers: {
            'List-Unsubscribe': `<${FRONTEND_URL}/api/campaigns/unsubscribe?email=${encodeURIComponent(sub.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        sent++;

        // Record delivered event
        await db.insert(emailEvents).values({
          campaignId: id,
          subscriberId: sub.id,
          email: sub.email,
          eventType: 'delivered',
        });
      } catch (err: any) {
        console.error(`Failed to send to ${sub.email}:`, err);
        failed++;
      }
    }
  }

  // Update campaign status
  const finalStatus = failed === subscriberList.length ? 'failed' : 'sent';
  await db.update(campaigns)
    .set({
      status: finalStatus as any,
      sentAt: new Date(),
      deliveredCount: sent,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id));

  // Update subscriber stats
  const now = new Date();
  for (const sub of subscriberList) {
    await db.update(subscribers)
      .set({
        lastEmailedAt: now,
        emailsReceived: sql`COALESCE(${subscribers.emailsReceived}, 0) + 1`,
        updatedAt: now,
      })
      .where(eq(subscribers.id, sub.id));
  }

  await logActivity('send', 'campaign', id, c.subject, user?.id, user?.name, `Sent to ${sent} subscribers (${failed} failed)`, { sent, failed, recipientCount: subscriberList.length });

  res.json({
    message: `Campaign sent to ${sent} subscribers${failed > 0 ? ` (${failed} failed)` : ''}`,
    sent,
    failed,
    status: finalStatus,
  });
});

// ============================================
// CAMPAIGN ANALYTICS
// ============================================

router.get('/:id/analytics', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (campaign.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const c = campaign[0];

  // Get all events for this campaign
  const events = await db.select().from(emailEvents)
    .where(eq(emailEvents.campaignId, id))
    .orderBy(desc(emailEvents.createdAt));

  // Compute aggregates
  const delivered = events.filter(e => e.eventType === 'delivered').length;
  const uniqueOpens = new Set(events.filter(e => e.eventType === 'opened').map(e => e.email)).size;
  const uniqueClicks = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.email)).size;
  const bounced = events.filter(e => e.eventType === 'bounced').length;
  const complained = events.filter(e => e.eventType === 'complained').length;
  const unsubscribed = events.filter(e => e.eventType === 'unsubscribed').length;

  // Click breakdown by URL
  const clicksByUrl: Record<string, { url: string; clicks: number; uniqueClicks: number }> = {};
  const clickEvents = events.filter(e => e.eventType === 'clicked' && e.metadata);
  for (const event of clickEvents) {
    const url = (event.metadata as any)?.url || 'unknown';
    if (!clicksByUrl[url]) {
      clicksByUrl[url] = { url, clicks: 0, uniqueClicks: 0 };
    }
    clicksByUrl[url].clicks++;
  }
  // Compute unique clicks per URL
  const uniqueClicksByUrl = new Map<string, Set<string>>();
  for (const event of clickEvents) {
    const url = (event.metadata as any)?.url || 'unknown';
    if (!uniqueClicksByUrl.has(url)) uniqueClicksByUrl.set(url, new Set());
    uniqueClicksByUrl.get(url)!.add(event.email);
  }
  for (const [url, emails] of uniqueClicksByUrl) {
    if (clicksByUrl[url]) clicksByUrl[url].uniqueClicks = emails.size;
  }

  // Timeline data (hourly for first 72 hours)
  const timeline: { hour: string; opens: number; clicks: number }[] = [];
  if (c.sentAt) {
    const sentTime = new Date(c.sentAt).getTime();
    for (let h = 0; h < 72; h++) {
      const hourStart = sentTime + h * 3600000;
      const hourEnd = hourStart + 3600000;
      const opensInHour = events.filter(e =>
        e.eventType === 'opened' &&
        new Date(e.createdAt).getTime() >= hourStart &&
        new Date(e.createdAt).getTime() < hourEnd
      ).length;
      const clicksInHour = events.filter(e =>
        e.eventType === 'clicked' &&
        new Date(e.createdAt).getTime() >= hourStart &&
        new Date(e.createdAt).getTime() < hourEnd
      ).length;
      if (opensInHour > 0 || clicksInHour > 0) {
        timeline.push({
          hour: new Date(hourStart).toISOString(),
          opens: opensInHour,
          clicks: clicksInHour,
        });
      }
    }
  }

  const recipientCount = c.recipientCount || 0;

  res.json({
    campaign: {
      id: c.id,
      subject: c.subject,
      status: c.status,
      sentAt: c.sentAt,
      recipientCount,
    },
    summary: {
      delivered,
      opened: uniqueOpens,
      openRate: recipientCount > 0 ? (uniqueOpens / recipientCount * 100).toFixed(1) : '0.0',
      clicked: uniqueClicks,
      clickRate: recipientCount > 0 ? (uniqueClicks / recipientCount * 100).toFixed(1) : '0.0',
      bounced,
      complained,
      unsubscribed,
    },
    clickBreakdown: Object.values(clicksByUrl),
    timeline,
    recentEvents: events.slice(0, 50).map(e => ({
      id: e.id,
      email: e.email,
      eventType: e.eventType,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
  });
});

// ============================================
// TRACKING ENDPOINTS (public, no auth)
// ============================================

// Open tracking pixel
router.get('/track/open/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const email = req.query.email as string;

  if (campaignId && email) {
    try {
      // Find subscriber
      const sub = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, email));

      await db.insert(emailEvents).values({
        campaignId,
        subscriberId: sub[0]?.id || null,
        email,
        eventType: 'opened',
      });

      // Update subscriber last opened
      if (sub[0]) {
        await db.update(subscribers)
          .set({ lastOpenedAt: new Date(), updatedAt: new Date() })
          .where(eq(subscribers.id, sub[0].id));
      }
    } catch (e) {
      // Silent fail for tracking
    }
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(pixel);
});

// Click tracking redirect
router.get('/track/click/:campaignId/:linkIndex', async (req: Request, res: Response) => {
  const { campaignId, linkIndex } = req.params;
  const email = req.query.email as string;
  const url = req.query.url as string;

  if (campaignId && email) {
    try {
      const sub = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, email));

      await db.insert(emailEvents).values({
        campaignId,
        subscriberId: sub[0]?.id || null,
        email,
        eventType: 'clicked',
        metadata: { url: url || '', linkIndex: parseInt(linkIndex) || 0 },
      });

      // Update subscriber last clicked
      if (sub[0]) {
        await db.update(subscribers)
          .set({ lastClickedAt: new Date(), updatedAt: new Date() })
          .where(eq(subscribers.id, sub[0].id));
      }
    } catch (e) {
      // Silent fail for tracking
    }
  }

  // Redirect to original URL
  res.redirect(url || '/');
});

// ============================================
// UNSUBSCRIBE (public, no auth)
// ============================================

router.get('/unsubscribe', async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).send('Missing email parameter');
  }

  try {
    const sub = await db.select().from(subscribers).where(eq(subscribers.email, email));

    if (sub.length > 0 && sub[0].subscribed) {
      await db.update(subscribers)
        .set({
          subscribed: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscribers.id, sub[0].id));
    }
  } catch (e) {
    // Continue to show confirmation even on error
  }

  // Return a simple branded unsubscribe confirmation page
  res.send(`<!DOCTYPE html>
<html>
<head><title>Unsubscribed - Lyne Tilt</title>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 60px 20px; color: #44403c; background: #fafaf9; }
  h1 { font-size: 24px; margin-bottom: 16px; }
  p { font-size: 16px; color: #78716c; }
</style>
</head>
<body>
  <h1>You've been unsubscribed</h1>
  <p>You will no longer receive marketing emails from Lyne Tilt.</p>
  <p style="margin-top: 32px;"><a href="${FRONTEND_URL}" style="color: #8d3038;">Return to Lyne Tilt</a></p>
</body>
</html>`);
});

// ============================================
// RESEND WEBHOOKS
// ============================================

router.post('/webhooks/resend', async (req: Request, res: Response) => {
  const event = req.body;

  if (!event || !event.type) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const email = event.data?.to?.[0] || event.data?.email || '';
  // Try to find the campaign ID from headers or metadata
  // Resend webhooks include the email ID which we can correlate
  // For now, we'll process bounce/complaint events without campaign linkage
  // and link them when possible

  try {
    switch (event.type) {
      case 'email.bounced': {
        const isHard = event.data?.bounce_type === 'hard' || !event.data?.bounce_type;
        const reason = event.data?.error_message || event.data?.bounce_type || 'Unknown';

        if (email) {
          // Find subscriber
          const sub = await db.select().from(subscribers).where(eq(subscribers.email, email));

          if (isHard) {
            // Hard bounce → suppress
            try {
              await db.insert(suppressionList).values({
                email,
                reason: 'hard_bounce',
                source: 'webhook',
                details: reason,
              });
            } catch (e) {
              // Might already be suppressed, that's fine
            }

            if (sub[0]) {
              await db.update(subscribers)
                .set({ subscribed: false, bounceCount: (sub[0].bounceCount || 0) + 1, lastBounceAt: new Date(), updatedAt: new Date() })
                .where(eq(subscribers.id, sub[0].id));
            }
          } else {
            // Soft bounce → increment counter, check for consecutive
            if (sub[0]) {
              const newBounceCount = (sub[0].bounceCount || 0) + 1;
              const lastBounce = sub[0].lastBounceAt;
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

              await db.update(subscribers)
                .set({ bounceCount: newBounceCount, lastBounceAt: new Date(), updatedAt: new Date() })
                .where(eq(subscribers.id, sub[0].id));

              // 3 consecutive soft bounces within 7 days → suppress
              if (newBounceCount >= 3 && lastBounce && new Date(lastBounce) > sevenDaysAgo) {
                try {
                  await db.insert(suppressionList).values({
                    email,
                    reason: 'consecutive_soft_bounce',
                    source: 'system',
                    details: `${newBounceCount} soft bounces within 7 days`,
                  });
                } catch (e) {
                  // Already suppressed
                }

                await db.update(subscribers)
                  .set({ subscribed: false, updatedAt: new Date() })
                  .where(eq(subscribers.id, sub[0].id));
              }
            }
          }
        }
        break;
      }

      case 'email.complained': {
        if (email) {
          // Complaint → suppress + unsubscribe
          try {
            await db.insert(suppressionList).values({
              email,
              reason: 'complaint',
              source: 'webhook',
              details: 'Spam complaint received',
            });
          } catch (e) {
            // Already suppressed
          }

          const sub = await db.select().from(subscribers).where(eq(subscribers.email, email));
          if (sub[0]) {
            await db.update(subscribers)
              .set({ subscribed: false, unsubscribedAt: new Date(), updatedAt: new Date() })
              .where(eq(subscribers.id, sub[0].id));
          }
        }
        break;
      }

      case 'email.delivered':
      case 'email.opened':
      case 'email.clicked':
        // These are handled by our tracking endpoints primarily
        // But we can process webhook versions too if they include campaign context
        break;
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

// ============================================
// SUPPRESSION LIST
// ============================================

router.get('/suppression', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(suppressionList).orderBy(desc(suppressionList.createdAt));
  res.json(result);
});

router.post('/suppression', authMiddleware, async (req: Request, res: Response) => {
  const { email, reason, details } = req.body;
  const user = (req as any).user;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await db.insert(suppressionList).values({
      email: email.toLowerCase(),
      reason: reason || 'manual',
      source: 'admin',
      details: details || `Manually added by ${user?.name || 'admin'}`,
    }).returning();

    await logActivity('suppress' as any, 'suppression', result[0].id, email, user?.id, user?.name, 'Address suppressed');

    res.status(201).json(result[0]);
  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Email is already suppressed' });
    }
    throw e;
  }
});

router.delete('/suppression/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const existing = await db.select().from(suppressionList).where(eq(suppressionList.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Suppression entry not found' });
  }

  await db.delete(suppressionList).where(eq(suppressionList.id, id));
  await logActivity('unsuppress' as any, 'suppression', id, existing[0].email, user?.id, user?.name, 'Address removed from suppression');

  res.json({ message: 'Removed from suppression list' });
});

// ============================================
// PREVIEW RECIPIENTS
// ============================================

router.post('/preview-recipients', authMiddleware, async (req: Request, res: Response) => {
  const { audience, segmentFilters } = req.body;

  let subscriberList = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));
  const suppressedEmails = await getSuppressedEmails();

  if (audience === 'segment' && segmentFilters) {
    subscriberList = filterSubscribersBySegment(subscriberList, segmentFilters);
  }

  // Filter out suppressed
  subscriberList = subscriberList.filter(s => !suppressedEmails.has(s.email.toLowerCase()));

  const allSubscribers = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));
  const sources = [...new Set(allSubscribers.map(s => s.source))];
  const tags = await db.select().from(subscriberTags);

  res.json({
    count: subscriberList.length,
    subscribers: subscriberList.map(s => ({ email: s.email, name: s.name, source: s.source })),
    availableSources: sources,
    availableTags: tags.map(t => t.name),
  });
});

export default router;
