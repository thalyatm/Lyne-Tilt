import { eq, and, lte, isNotNull, sql } from 'drizzle-orm';
import { emailDrafts, sentEmails, subscribers, automationQueue } from '../db/schema';
import { sendEmail, sendBulkNewsletter } from './email';
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
