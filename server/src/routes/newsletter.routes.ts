import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { eq, desc } from 'drizzle-orm';
import { db, subscribers, subscriberTags, emailDrafts, sentEmails, emailSnippets } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { triggerAutomation } from './automations.routes.js';

const router = Router();

// Initialize Resend (will be undefined if no API key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Lyne Tilt <hello@lynetilt.com>';

// Helper to filter subscribers by segment
interface SubscriberBase {
  id: string;
  email: string;
  name: string | null;
  source: string;
  tags: string[] | null;
  [key: string]: any;
}

function filterSubscribers<T extends SubscriberBase>(subscriberList: T[], filters?: { sources?: string[]; tags?: string[] }): T[] {
  if (!filters) return subscriberList;

  return subscriberList.filter(sub => {
    // Filter by source
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(sub.source)) return false;
    }
    // Filter by tags (subscriber must have at least one matching tag)
    if (filters.tags && filters.tags.length > 0) {
      if (!sub.tags || !sub.tags.some(tag => filters.tags!.includes(tag))) return false;
    }
    return true;
  });
}

// Generate branded HTML email template
function generateEmailHtml(body: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyne Tilt</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border:1px solid #e7e5e4;">
          <!-- Header -->
          <tr>
            <td style="padding:30px 40px;border-bottom:1px solid #e7e5e4;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:normal;color:#1c1917;letter-spacing:0.1em;">LYNE TILT</h1>
              <p style="margin:8px 0 0;font-size:11px;color:#78716c;letter-spacing:0.15em;text-transform:uppercase;">Wearable Art & Creative Coaching</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;color:#44403c;font-size:16px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 15px;font-size:12px;color:#78716c;">
                <a href="https://lynetilt.com/shop" style="color:#8d3038;text-decoration:none;margin:0 10px;">Shop</a>
                <a href="https://lynetilt.com/coaching" style="color:#8d3038;text-decoration:none;margin:0 10px;">Coaching</a>
                <a href="https://lynetilt.com/learn" style="color:#8d3038;text-decoration:none;margin:0 10px;">Learn</a>
              </p>
              <p style="margin:0;font-size:11px;color:#a8a29e;">
                Australia-based · Est. 2023<br>
                <a href="{{{unsubscribe}}}" style="color:#a8a29e;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============ SUBSCRIBERS ============

// GET all subscribers (protected)
router.get('/subscribers', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(subscribers)
    .where(eq(subscribers.subscribed, true))
    .orderBy(desc(subscribers.subscribedAt));
  res.json(result);
});

// POST subscribe (public - for newsletter signup forms)
router.post('/subscribe', async (req: Request, res: Response) => {
  const { email, name, source = 'website' } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Check if already subscribed
  const existing = await db.select().from(subscribers)
    .where(eq(subscribers.email, email.toLowerCase()));

  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already subscribed' });
  }

  const now = new Date();
  const result = await db.insert(subscribers).values({
    email: email.toLowerCase(),
    name: name || null,
    source,
    tags: [],
    subscribed: true,
    subscribedAt: now,
    emailsReceived: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  const newSubscriber = result[0];

  // Trigger newsletter signup automation
  try {
    await triggerAutomation('newsletter_signup', newSubscriber.email, newSubscriber.name || undefined);
  } catch (error) {
    console.error('Failed to trigger newsletter automation:', error);
  }

  res.status(201).json({ message: 'Successfully subscribed', subscriber: newSubscriber });
});

// PUT update subscriber (protected)
router.put('/subscribers/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, tags } = req.body;

  const existing = await db.select().from(subscribers).where(eq(subscribers.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (tags !== undefined) updateData.tags = tags;

  const result = await db.update(subscribers)
    .set(updateData)
    .where(eq(subscribers.id, id))
    .returning();

  res.json({ message: 'Subscriber updated', subscriber: result[0] });
});

// DELETE subscriber (protected)
router.delete('/subscribers/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await db.select().from(subscribers).where(eq(subscribers.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  await db.delete(subscribers).where(eq(subscribers.id, id));

  res.json({ message: 'Subscriber removed' });
});

// ============ TAGS ============

// GET all tags
router.get('/tags', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(subscriberTags);
  res.json(result.map(t => t.name));
});

// POST create new tag
router.post('/tags', authMiddleware, async (req: Request, res: Response) => {
  const { tag } = req.body;

  if (!tag || typeof tag !== 'string') {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  // Check if tag exists
  const existing = await db.select().from(subscriberTags).where(eq(subscriberTags.name, tag));
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Tag already exists' });
  }

  await db.insert(subscriberTags).values({
    name: tag,
    createdAt: new Date(),
  });

  const allTags = await db.select().from(subscriberTags);
  res.status(201).json({ message: 'Tag created', tags: allTags.map(t => t.name) });
});

// DELETE tag
router.delete('/tags/:tag', authMiddleware, async (req: Request, res: Response) => {
  const { tag } = req.params;

  const existing = await db.select().from(subscriberTags).where(eq(subscriberTags.name, tag));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Tag not found' });
  }

  await db.delete(subscriberTags).where(eq(subscriberTags.name, tag));

  // Also remove tag from all subscribers
  const allSubscribers = await db.select().from(subscribers);
  for (const sub of allSubscribers) {
    if (sub.tags && sub.tags.includes(tag)) {
      await db.update(subscribers)
        .set({ tags: sub.tags.filter(t => t !== tag), updatedAt: new Date() })
        .where(eq(subscribers.id, sub.id));
    }
  }

  res.json({ message: 'Tag deleted' });
});

// ============ DRAFTS ============

// GET all drafts
router.get('/drafts', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(emailDrafts).orderBy(desc(emailDrafts.updatedAt));
  res.json(result);
});

// GET single draft
router.get('/drafts/:id', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(emailDrafts).where(eq(emailDrafts.id, req.params.id));
  if (result.length === 0) {
    return res.status(404).json({ error: 'Draft not found' });
  }
  res.json(result[0]);
});

// POST create draft
router.post('/drafts', authMiddleware, async (req: Request, res: Response) => {
  const { subject, preheader, body, bodyHtml, audience, segmentFilters, scheduledFor } = req.body;

  const now = new Date();
  const result = await db.insert(emailDrafts).values({
    subject: subject || '',
    preheader: preheader || null,
    body: body || '',
    bodyHtml: bodyHtml || null,
    audience: audience || 'all',
    segmentFilters: segmentFilters || null,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json({ message: 'Draft saved', draft: result[0] });
});

// PUT update draft
router.put('/drafts/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject, preheader, body, bodyHtml, audience, segmentFilters, scheduledFor } = req.body;

  const existing = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (subject !== undefined) updateData.subject = subject;
  if (preheader !== undefined) updateData.preheader = preheader;
  if (body !== undefined) updateData.body = body;
  if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
  if (audience !== undefined) updateData.audience = audience;
  if (segmentFilters !== undefined) updateData.segmentFilters = segmentFilters;
  if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;

  const result = await db.update(emailDrafts)
    .set(updateData)
    .where(eq(emailDrafts.id, id))
    .returning();

  res.json({ message: 'Draft updated', draft: result[0] });
});

// DELETE draft
router.delete('/drafts/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  await db.delete(emailDrafts).where(eq(emailDrafts.id, id));

  res.json({ message: 'Draft deleted' });
});

// ============ SENDING ============

// GET sent emails history (protected)
router.get('/sent', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  res.json(result);
});

// POST send test email (protected)
router.post('/send-test', authMiddleware, async (req: Request, res: Response) => {
  const { email, subject, preheader, body, bodyHtml } = req.body;

  if (!email || !subject || !body) {
    return res.status(400).json({ error: 'Email, subject, and body are required' });
  }

  const htmlContent = bodyHtml || generateEmailHtml(body, preheader);

  if (!resend) {
    // Development mode - just log
    console.log('=== TEST EMAIL (No Resend API key) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body.substring(0, 200)}...`);
    return res.json({ message: 'Test email logged (no Resend API key configured)', preview: true });
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[TEST] ${subject}`,
      html: htmlContent,
      text: body,
    });

    res.json({ message: 'Test email sent', resendId: result.data?.id });
  } catch (error: any) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// POST preview recipients (get count without sending)
router.post('/preview-recipients', authMiddleware, async (req: Request, res: Response) => {
  const { audience, segmentFilters } = req.body;

  let subscriberList = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));

  if (audience === 'segment' && segmentFilters) {
    subscriberList = filterSubscribers(subscriberList, segmentFilters);
  }

  // Get unique sources for filter options
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

// POST send email to subscribers (protected)
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  const { subject, preheader, body, bodyHtml, audience, segmentFilters, draftId } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  let subscriberList = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));

  // Apply segment filters if specified
  if (audience === 'segment' && segmentFilters) {
    subscriberList = filterSubscribers(subscriberList, segmentFilters);
  }

  if (subscriberList.length === 0) {
    return res.status(400).json({ error: 'No subscribers match the selected criteria' });
  }

  const htmlContent = bodyHtml || generateEmailHtml(body, preheader);
  const recipientEmails = subscriberList.map(s => s.email);

  let resendId: string | undefined;

  if (!resend) {
    console.log('=== NEWSLETTER SEND (No Resend API key) ===');
    console.log(`To: ${recipientEmails.length} subscribers`);
    console.log(`Subject: ${subject}`);
  } else {
    try {
      // Send via Resend (batch send)
      const result = await resend.batch.send(
        recipientEmails.map(email => ({
          from: FROM_EMAIL,
          to: email,
          subject,
          html: htmlContent,
          text: body,
        }))
      );

      resendId = result.data?.data?.[0]?.id;
    } catch (error: any) {
      console.error('Failed to send emails:', error);
      return res.status(500).json({ error: error.message || 'Failed to send emails' });
    }
  }

  // Record the sent email
  const sentEmailResult = await db.insert(sentEmails).values({
    subject,
    preheader: preheader || null,
    body,
    bodyHtml: htmlContent,
    recipientCount: subscriberList.length,
    recipientEmails,
    audience: audience || 'all',
    segmentFilters: segmentFilters || null,
    resendId: resendId || null,
    sentAt: new Date(),
  }).returning();

  // Update subscriber stats
  const now = new Date();
  for (const sub of subscriberList) {
    await db.update(subscribers)
      .set({
        lastEmailedAt: now,
        emailsReceived: (sub.emailsReceived || 0) + 1,
        updatedAt: now,
      })
      .where(eq(subscribers.id, sub.id));
  }

  // Delete draft if it was sent from a draft
  if (draftId) {
    await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));
  }

  res.json({
    message: `Email sent to ${subscriberList.length} subscribers`,
    sentEmail: sentEmailResult[0],
  });
});

// ============ STATS ============

// GET newsletter stats
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  const allSubscribers = await db.select().from(subscribers).where(eq(subscribers.subscribed, true));
  const allSentEmails = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  const allDrafts = await db.select().from(emailDrafts);

  // Calculate stats
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newSubscribers = allSubscribers.filter(s => new Date(s.subscribedAt) > thirtyDaysAgo).length;
  const sources = allSubscribers.reduce((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    totalSubscribers: allSubscribers.length,
    newSubscribersLast30Days: newSubscribers,
    totalEmailsSent: allSentEmails.length,
    draftsCount: allDrafts.length,
    subscribersBySource: sources,
    lastEmailSentAt: allSentEmails[0]?.sentAt,
  });
});

// ============ SNIPPETS ============

// GET all snippets
router.get('/snippets', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(emailSnippets)
    .orderBy(desc(emailSnippets.updatedAt));
  res.json(result);
});

// POST create snippet
router.post('/snippets', authMiddleware, async (req: Request, res: Response) => {
  const { name, category, blocks } = req.body;

  if (!name || !blocks || !Array.isArray(blocks)) {
    return res.status(400).json({ error: 'Name and blocks are required' });
  }

  const now = new Date();
  const result = await db.insert(emailSnippets).values({
    name,
    category: category || 'Content',
    blocks,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

// PUT update snippet
router.put('/snippets/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, category, blocks } = req.body;

  const existing = await db.select().from(emailSnippets).where(eq(emailSnippets.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (blocks !== undefined) updateData.blocks = blocks;

  const result = await db.update(emailSnippets)
    .set(updateData)
    .where(eq(emailSnippets.id, id))
    .returning();

  res.json(result[0]);
});

// DELETE snippet
router.delete('/snippets/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await db.select().from(emailSnippets).where(eq(emailSnippets.id, id));
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  await db.delete(emailSnippets).where(eq(emailSnippets.id, id));
  res.json({ message: 'Snippet deleted' });
});

export default router;
