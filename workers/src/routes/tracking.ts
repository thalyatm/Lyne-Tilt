import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { emailEvents, sentEmails } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const trackingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 1x1 transparent GIF pixel (43 bytes)
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

// GET /open/:sentEmailId/:subscriberEmail - Track email open
trackingRoutes.get('/open/:sentEmailId/:subscriberEmail', async (c) => {
  const db = c.get('db');
  const sentEmailId = c.req.param('sentEmailId');
  const subscriberEmail = decodeURIComponent(c.req.param('subscriberEmail'));
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;
  const userAgent = c.req.header('user-agent') || null;

  try {
    // Deduplicate: only record if no 'open' event exists for this sentEmailId + subscriberEmail
    const existing = await db.select({ id: emailEvents.id })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.sentEmailId, sentEmailId),
          eq(emailEvents.subscriberEmail, subscriberEmail),
          eq(emailEvents.eventType, 'open')
        )
      )
      .get();

    if (!existing) {
      // Record the open event
      await db.insert(emailEvents).values({
        sentEmailId,
        subscriberEmail,
        eventType: 'open',
        ipAddress,
        userAgent,
      });

      // Increment openCount on sent_emails
      await db.update(sentEmails)
        .set({ openCount: sql`${sentEmails.openCount} + 1` })
        .where(eq(sentEmails.id, sentEmailId));
    }
  } catch (err) {
    // Silently fail - don't break the pixel response
    console.error('Error tracking open:', err);
  }

  // Always return the tracking pixel
  return new Response(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRACKING_PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
});

// GET /click/:sentEmailId/:linkIndex/:subscriberEmail - Track email click
trackingRoutes.get('/click/:sentEmailId/:linkIndex/:subscriberEmail', async (c) => {
  const db = c.get('db');
  const sentEmailId = c.req.param('sentEmailId');
  const linkIndex = parseInt(c.req.param('linkIndex'), 10);
  const subscriberEmail = decodeURIComponent(c.req.param('subscriberEmail'));
  const url = c.req.query('url');

  if (!url) {
    return c.json({ error: 'Missing url query parameter' }, 400);
  }

  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;
  const userAgent = c.req.header('user-agent') || null;

  try {
    // Record the click event (clicks are not deduplicated - each click is recorded)
    await db.insert(emailEvents).values({
      sentEmailId,
      subscriberEmail,
      eventType: 'click',
      linkUrl: url,
      linkIndex,
      ipAddress,
      userAgent,
    });

    // Increment clickCount on sent_emails
    await db.update(sentEmails)
      .set({ clickCount: sql`${sentEmails.clickCount} + 1` })
      .where(eq(sentEmails.id, sentEmailId));
  } catch (err) {
    // Silently fail - still redirect the user
    console.error('Error tracking click:', err);
  }

  // 302 redirect to the actual URL
  return c.redirect(url, 302);
});
