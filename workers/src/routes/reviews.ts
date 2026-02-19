import { Hono } from 'hono';
import { eq, and, desc, sql, like, or, count, avg } from 'drizzle-orm';
import { productReviews, products, orders, orderItems, customerUsers } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const reviewsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// HELPER: Recalculate product rating & reviewCount
// ============================================

async function recalculateProductRating(
  db: ReturnType<typeof import('drizzle-orm/d1').drizzle>,
  productId: string | null
) {
  if (!productId) return;

  const result = await db
    .select({
      avgRating: avg(productReviews.rating),
      total: count(),
    })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.productId, productId),
        eq(productReviews.status, 'approved')
      )
    )
    .get();

  const avgRating = result?.avgRating ? parseFloat(result.avgRating) : null;
  const reviewCount = result?.total ?? 0;

  await db
    .update(products)
    .set({
      rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// GET /api/reviews/featured - Get featured approved reviews for the home page
reviewsRoutes.get('/featured', async (c) => {
  const db = c.get('db');

  const reviews = await db
    .select({
      id: productReviews.id,
      productName: productReviews.productName,
      linkedProductName: products.name,
      customerName: productReviews.customerName,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      createdAt: productReviews.createdAt,
    })
    .from(productReviews)
    .leftJoin(products, eq(productReviews.productId, products.id))
    .where(
      and(
        eq(productReviews.status, 'approved'),
        eq(productReviews.featured, true)
      )
    )
    .orderBy(desc(productReviews.createdAt))
    .all();

  return c.json(reviews.map(r => ({
    id: r.id,
    productName: r.linkedProductName || r.productName,
    customerName: r.customerName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
  })));
});

// GET /api/reviews/product/:productId - Get approved reviews for a product
reviewsRoutes.get('/product/:productId', async (c) => {
  const db = c.get('db');
  const productId = c.req.param('productId');

  // Fetch all approved reviews, newest first
  const reviews = await db
    .select()
    .from(productReviews)
    .where(
      and(
        eq(productReviews.productId, productId),
        eq(productReviews.status, 'approved')
      )
    )
    .orderBy(desc(productReviews.createdAt))
    .all();

  // Calculate summary
  const totalReviews = reviews.length;
  let averageRating = 0;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (totalReviews > 0) {
    let sum = 0;
    for (const review of reviews) {
      sum += review.rating;
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    }
    averageRating = Math.round((sum / totalReviews) * 10) / 10;
  }

  return c.json({
    reviews,
    summary: {
      averageRating,
      totalReviews,
      distribution,
    },
  });
});

// POST /api/reviews/product/:productId - Submit a review (guest reviews allowed)
reviewsRoutes.post('/product/:productId', async (c) => {
  const db = c.get('db');
  const productId = c.req.param('productId');
  const body = await c.req.json();

  const { customerName, customerEmail, rating, title, body: reviewBody } = body;

  // Validate required fields
  if (!customerName || !customerEmail || !rating) {
    return c.json({ error: 'customerName, customerEmail, and rating are required' }, 400);
  }

  // Validate rating range
  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return c.json({ error: 'Rating must be an integer between 1 and 5' }, 400);
  }

  // Verify the product exists
  const product = await db
    .select({ id: products.id, name: products.name, productType: products.productType })
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Check if this is a verified purchase
  let isVerifiedPurchase = false;
  let customerId: string | null = null;

  const customer = await db
    .select({ id: customerUsers.id })
    .from(customerUsers)
    .where(sql`LOWER(${customerUsers.email}) = LOWER(${customerEmail})`)
    .get();

  if (customer) {
    customerId = customer.id;

    const verifiedOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, customer.id),
          sql`${orders.status} != 'cancelled'`,
          eq(orderItems.productId, productId)
        )
      )
      .get();

    if (verifiedOrder) {
      isVerifiedPurchase = true;
    }
  }

  // Create the review
  const review = await db
    .insert(productReviews)
    .values({
      productId,
      productName: product.name,
      customerId,
      customerName,
      customerEmail,
      rating,
      title: title || null,
      body: reviewBody || null,
      status: 'pending',
      isVerifiedPurchase,
      theme: product.productType || null,
    })
    .returning()
    .get();

  return c.json(review, 201);
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/reviews - List all reviews (admin)
reviewsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const statusFilter = c.req.query('status') || 'all';
  const ratingFilter = c.req.query('rating');
  const search = c.req.query('search');
  const productIdFilter = c.req.query('productId');

  // Build conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (statusFilter && statusFilter !== 'all') {
    conditions.push(eq(productReviews.status, statusFilter as 'pending' | 'approved' | 'rejected'));
  }

  if (ratingFilter) {
    const ratingNum = parseInt(ratingFilter, 10);
    if (ratingNum >= 1 && ratingNum <= 5) {
      conditions.push(eq(productReviews.rating, ratingNum));
    }
  }

  if (productIdFilter) {
    conditions.push(eq(productReviews.productId, productIdFilter));
  }

  const themeFilter = c.req.query('theme');
  if (themeFilter) {
    conditions.push(eq(productReviews.theme, themeFilter));
  }

  if (search) {
    const searchLower = `%${search.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${productReviews.customerName}) LIKE ${searchLower}`,
        sql`LOWER(${productReviews.customerEmail}) LIKE ${searchLower}`,
        sql`LOWER(${productReviews.title}) LIKE ${searchLower}`,
        sql`LOWER(${productReviews.body}) LIKE ${searchLower}`
      )!
    );
  }

  // Query reviews with product name
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const reviews = await db
    .select({
      id: productReviews.id,
      productId: productReviews.productId,
      productName: products.name,
      storedProductName: productReviews.productName,
      customerName: productReviews.customerName,
      customerEmail: productReviews.customerEmail,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      status: productReviews.status,
      isVerifiedPurchase: productReviews.isVerifiedPurchase,
      featured: productReviews.featured,
      theme: productReviews.theme,
      adminResponse: productReviews.adminResponse,
      respondedAt: productReviews.respondedAt,
      createdAt: productReviews.createdAt,
      updatedAt: productReviews.updatedAt,
    })
    .from(productReviews)
    .leftJoin(products, eq(productReviews.productId, products.id))
    .where(whereClause)
    .orderBy(desc(productReviews.createdAt))
    .all();

  // Map to use linked product name or stored product name
  const mappedReviews = reviews.map(r => ({
    ...r,
    productName: r.productName || r.storedProductName || 'Unknown product',
  }));

  // Calculate stats (all reviews, not filtered)
  const allReviews = await db
    .select({
      status: productReviews.status,
      rating: productReviews.rating,
    })
    .from(productReviews)
    .all();

  const total = allReviews.length;
  const pending = allReviews.filter((r) => r.status === 'pending').length;
  const approved = allReviews.filter((r) => r.status === 'approved').length;
  const rejected = allReviews.filter((r) => r.status === 'rejected').length;

  const approvedReviews = allReviews.filter((r) => r.status === 'approved');
  let averageRating = 0;
  if (approvedReviews.length > 0) {
    const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
    averageRating = Math.round((sum / approvedReviews.length) * 10) / 10;
  }

  return c.json({
    reviews: mappedReviews,
    stats: {
      total,
      pending,
      approved,
      rejected,
      averageRating,
    },
  });
});

// PATCH /api/reviews/:id/featured - Toggle featured status
reviewsRoutes.patch('/:id/featured', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Review not found' }, 404);
  }

  const featured = body.featured !== undefined ? !!body.featured : !existing.featured;

  const updated = await db
    .update(productReviews)
    .set({
      featured,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(productReviews.id, id))
    .returning()
    .get();

  return c.json(updated);
});

// PATCH /api/reviews/:id/status - Approve or reject a review
reviewsRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { status } = body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return c.json({ error: 'Status must be "approved" or "rejected"' }, 400);
  }

  const existing = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Review not found' }, 404);
  }

  const updated = await db
    .update(productReviews)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(productReviews.id, id))
    .returning()
    .get();

  // Recalculate product rating
  await recalculateProductRating(db as any, existing.productId);

  return c.json(updated);
});

// PATCH /api/reviews/:id/response - Add admin response to a review
reviewsRoutes.patch('/:id/response', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { adminResponse } = body;

  if (adminResponse === undefined || adminResponse === null) {
    return c.json({ error: 'adminResponse is required' }, 400);
  }

  const existing = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Review not found' }, 404);
  }

  const now = new Date().toISOString();

  const updated = await db
    .update(productReviews)
    .set({
      adminResponse,
      respondedAt: now,
      updatedAt: now,
    })
    .where(eq(productReviews.id, id))
    .returning()
    .get();

  return c.json(updated);
});

// PATCH /api/reviews/:id/theme - Update review theme (admin)
reviewsRoutes.patch('/:id/theme', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { theme } = body;

  const existing = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Review not found' }, 404);
  }

  const updated = await db
    .update(productReviews)
    .set({
      theme: theme || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(productReviews.id, id))
    .returning()
    .get();

  return c.json(updated);
});

// DELETE /api/reviews/:id - Delete a review (hard delete)
reviewsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Review not found' }, 404);
  }

  await db.delete(productReviews).where(eq(productReviews.id, id));

  // Recalculate product rating after deletion
  await recalculateProductRating(db as any, existing.productId);

  return c.json({ success: true });
});
