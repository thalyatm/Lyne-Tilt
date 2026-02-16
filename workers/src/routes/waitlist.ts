import { Hono } from 'hono';
import { eq, and, desc, sql, or, like, count, countDistinct } from 'drizzle-orm';
import { waitlist, products } from '../db/schema';
import { sendEmail } from '../utils/email';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const waitlistRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// HELPERS
// ============================================

function buildNotificationEmail(productName: string, productId: string, baseUrl: string): string {
  return `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1c1917; font-size: 24px;">Great news!</h1>
    <p style="color: #57534e; font-size: 16px; line-height: 1.6;">${productName} is back in stock and ready to be yours.</p>
    <a href="${baseUrl}/#/shop/${productId}" style="display: inline-block; background: #8d3038; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; margin-top: 16px;">Shop Now</a>
    <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">You received this email because you signed up to be notified.</p>
  </div>`;
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// POST /api/waitlist/join - Join the waitlist for a product
waitlistRoutes.post('/join', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { productId, email, customerName } = body;

  if (!productId || !email) {
    return c.json({ error: 'productId and email are required' }, 400);
  }

  // Validate product exists
  const product = await db.select({ id: products.id }).from(products)
    .where(eq(products.id, productId)).get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Check for duplicate (same productId + email with status 'waiting')
  const existing = await db.select({ id: waitlist.id }).from(waitlist)
    .where(and(
      eq(waitlist.productId, productId),
      eq(waitlist.email, email),
      eq(waitlist.status, 'waiting')
    )).get();

  if (existing) {
    // Idempotent — return success silently
    return c.json({ success: true, message: "You'll be notified when this item is back in stock" });
  }

  await db.insert(waitlist).values({
    productId,
    email,
    customerName: customerName || null,
    status: 'waiting',
  });

  return c.json({ success: true, message: "You'll be notified when this item is back in stock" });
});

// GET /api/waitlist/product/:productId/count - Get waitlist count for a product
waitlistRoutes.get('/product/:productId/count', async (c) => {
  const db = c.get('db');
  const productId = c.req.param('productId');

  const result = await db.select({ count: sql<number>`count(*)` }).from(waitlist)
    .where(and(
      eq(waitlist.productId, productId),
      eq(waitlist.status, 'waiting')
    )).get();

  return c.json({ count: result?.count || 0 });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/waitlist/ - List all waitlist entries (admin)
waitlistRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const statusFilter = c.req.query('status');
  const productIdFilter = c.req.query('productId');
  const search = c.req.query('search');

  // Build conditions
  const conditions: any[] = [];

  if (statusFilter && statusFilter !== 'all') {
    conditions.push(eq(waitlist.status, statusFilter as any));
  }

  if (productIdFilter) {
    conditions.push(eq(waitlist.productId, productIdFilter));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(waitlist.email, searchPattern),
        like(waitlist.customerName, searchPattern),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch entries with product join
  const entries = await db
    .select({
      id: waitlist.id,
      productId: waitlist.productId,
      productName: products.name,
      productImage: products.image,
      email: waitlist.email,
      customerName: waitlist.customerName,
      status: waitlist.status,
      notifiedAt: waitlist.notifiedAt,
      createdAt: waitlist.createdAt,
    })
    .from(waitlist)
    .leftJoin(products, eq(waitlist.productId, products.id))
    .where(where)
    .orderBy(desc(waitlist.createdAt))
    .all();

  // Fetch stats
  const [totalWaitingResult, totalNotifiedResult, totalProductsResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(waitlist)
      .where(eq(waitlist.status, 'waiting')).get(),
    db.select({ count: sql<number>`count(*)` }).from(waitlist)
      .where(eq(waitlist.status, 'notified')).get(),
    db.select({ count: countDistinct(waitlist.productId) }).from(waitlist)
      .where(eq(waitlist.status, 'waiting')).get(),
  ]);

  return c.json({
    entries,
    stats: {
      totalWaiting: totalWaitingResult?.count || 0,
      totalNotified: totalNotifiedResult?.count || 0,
      totalProducts: totalProductsResult?.count || 0,
    },
  });
});

// POST /api/waitlist/:id/notify - Manually notify a single waitlist entry (admin)
waitlistRoutes.post('/:id/notify', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  // Get the entry
  const entry = await db.select().from(waitlist).where(eq(waitlist.id, id)).get();
  if (!entry) {
    return c.json({ error: 'Waitlist entry not found' }, 404);
  }

  if (entry.status !== 'waiting') {
    return c.json({ error: `Cannot notify entry with status '${entry.status}'` }, 400);
  }

  // Get product info
  const product = await db.select().from(products).where(eq(products.id, entry.productId)).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
  const subject = `${product.name} is back in stock!`;
  const htmlBody = buildNotificationEmail(product.name, entry.productId, baseUrl);

  await sendEmail(c.env, entry.email, subject, htmlBody);

  // Update status to notified
  await db.update(waitlist)
    .set({ status: 'notified', notifiedAt: new Date().toISOString() })
    .where(eq(waitlist.id, id));

  return c.json({ success: true });
});

// POST /api/waitlist/product/:productId/notify-all - Notify all waiting entries for a product (admin)
waitlistRoutes.post('/product/:productId/notify-all', adminAuth, async (c) => {
  const db = c.get('db');
  const productId = c.req.param('productId');

  // Get product info
  const product = await db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get all waiting entries for this product
  const entries = await db.select().from(waitlist)
    .where(and(
      eq(waitlist.productId, productId),
      eq(waitlist.status, 'waiting')
    )).all();

  const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
  const subject = `${product.name} is back in stock!`;
  let notified = 0;

  for (const entry of entries) {
    try {
      const htmlBody = buildNotificationEmail(product.name, productId, baseUrl);
      await sendEmail(c.env, entry.email, subject, htmlBody);
      await db.update(waitlist)
        .set({ status: 'notified', notifiedAt: new Date().toISOString() })
        .where(eq(waitlist.id, entry.id));
      notified++;
    } catch (err) {
      console.error(`Failed to notify waitlist entry ${entry.id}:`, err);
    }
  }

  return c.json({ notified });
});

// DELETE /api/waitlist/:id - Remove a waitlist entry (admin)
waitlistRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const entry = await db.select({ id: waitlist.id }).from(waitlist).where(eq(waitlist.id, id)).get();
  if (!entry) {
    return c.json({ error: 'Waitlist entry not found' }, 404);
  }

  await db.delete(waitlist).where(eq(waitlist.id, id));

  return c.json({ success: true });
});

// DELETE /api/waitlist/product/:productId - Remove all waitlist entries for a product (admin)
waitlistRoutes.delete('/product/:productId', adminAuth, async (c) => {
  const db = c.get('db');
  const productId = c.req.param('productId');

  await db.delete(waitlist).where(eq(waitlist.productId, productId));

  return c.json({ success: true });
});
