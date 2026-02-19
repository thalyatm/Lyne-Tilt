import { Hono } from 'hono';
import { eq, and, inArray, sql, desc, count } from 'drizzle-orm';
import { wishlistItems, products, customerUsers } from '../db/schema';
import { customerAuth, adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const wishlistRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Admin endpoint (before customerAuth middleware)
wishlistRoutes.get('/admin/summary', adminAuth, async (c) => {
  const db = c.get('db');

  // Most wishlisted products
  const topProducts = await db
    .select({
      productId: wishlistItems.productId,
      productName: products.name,
      productImage: products.image,
      productPrice: products.price,
      wishlistCount: count(wishlistItems.id),
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .groupBy(wishlistItems.productId)
    .orderBy(desc(count(wishlistItems.id)))
    .limit(50)
    .all();

  // Total stats
  const totalItems = await db
    .select({ total: count() })
    .from(wishlistItems)
    .get();

  const uniqueCustomers = await db
    .select({ total: sql`COUNT(DISTINCT ${wishlistItems.userId})` })
    .from(wishlistItems)
    .get();

  // Recent activity
  const recentActivity = await db
    .select({
      id: wishlistItems.id,
      productId: wishlistItems.productId,
      productName: products.name,
      productImage: products.image,
      addedAt: wishlistItems.addedAt,
      customerName: sql`${customerUsers.firstName} || ' ' || ${customerUsers.lastName}`,
      customerEmail: customerUsers.email,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .innerJoin(customerUsers, eq(wishlistItems.userId, customerUsers.id))
    .orderBy(desc(wishlistItems.addedAt))
    .limit(20)
    .all();

  return c.json({
    topProducts,
    totalItems: totalItems?.total || 0,
    uniqueCustomers: uniqueCustomers?.total || 0,
    recentActivity,
  });
});

// All remaining wishlist routes require customer auth
wishlistRoutes.use('*', customerAuth);

// GET /api/wishlist — Get user's wishlist with product details
wishlistRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('customerUser');

  const items = await db
    .select({
      id: wishlistItems.id,
      productId: wishlistItems.productId,
      addedAt: wishlistItems.addedAt,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      currency: products.currency,
      image: products.image,
      availability: products.availability,
      productType: products.productType,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user!.id))
    .all();

  return c.json({ items });
});

// GET /api/wishlist/ids — Get just product IDs (for checking state)
wishlistRoutes.get('/ids', async (c) => {
  const db = c.get('db');
  const user = c.get('customerUser');

  const items = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, user!.id))
    .all();

  return c.json({ productIds: items.map((i) => i.productId) });
});

// POST /api/wishlist — Add item to wishlist
wishlistRoutes.post('/', async (c) => {
  const db = c.get('db');
  const user = c.get('customerUser');
  const { productId } = await c.req.json();

  if (!productId) {
    return c.json({ error: 'productId is required' }, 400);
  }

  // Check product exists
  const product = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Upsert (ignore if already exists)
  try {
    await db.insert(wishlistItems).values({
      userId: user!.id,
      productId,
    });
  } catch (err: any) {
    // Unique constraint violation means it already exists — that's fine
    if (!err?.message?.includes('UNIQUE')) throw err;
  }

  return c.json({ success: true });
});

// DELETE /api/wishlist/:productId — Remove item from wishlist
wishlistRoutes.delete('/:productId', async (c) => {
  const db = c.get('db');
  const user = c.get('customerUser');
  const productId = c.req.param('productId');

  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, user!.id), eq(wishlistItems.productId, productId)));

  return c.json({ success: true });
});
