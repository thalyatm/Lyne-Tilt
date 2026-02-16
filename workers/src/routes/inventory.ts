import { Hono } from 'hono';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { products } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const inventoryRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply admin auth to all routes
inventoryRoutes.use('*', adminAuth);

// ─── GET / — Stock overview with filters, search, sorting ──
inventoryRoutes.get('/', async (c) => {
  const db = c.get('db');

  const filter = c.req.query('filter') || 'all';
  const search = (c.req.query('search') || '').trim();
  const type = c.req.query('type') || 'all';
  const sort = c.req.query('sort') || 'name';

  // ── Build filter conditions ─────────────────────────────
  const conditions: any[] = [
    eq(products.status, 'active'),
    eq(products.trackInventory, true),
  ];

  // Stock level filter
  if (filter === 'low') {
    conditions.push(sql`${products.quantity} < 5`);
    conditions.push(sql`${products.quantity} > 0`);
  } else if (filter === 'out') {
    conditions.push(eq(products.quantity, 0));
  } else if (filter === 'in') {
    conditions.push(sql`${products.quantity} >= 5`);
  }

  // Product type filter
  if (type === 'physical') {
    conditions.push(eq(products.productType, 'wearable'));
  } else if (type === 'digital') {
    conditions.push(eq(products.productType, 'digital'));
  } else if (type === 'wall-art') {
    conditions.push(eq(products.productType, 'wall-art'));
  }

  // Search
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(sql`LOWER(${products.name}) LIKE ${pattern}`);
  }

  // ── Sorting ─────────────────────────────────────────────
  let orderBy;
  switch (sort) {
    case 'stock-asc':
      orderBy = asc(products.quantity);
      break;
    case 'stock-desc':
      orderBy = desc(products.quantity);
      break;
    case 'newest':
      orderBy = desc(products.createdAt);
      break;
    case 'name':
    default:
      orderBy = asc(products.name);
      break;
  }

  // ── Query products ──────────────────────────────────────
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      productType: products.productType,
      status: products.status,
      price: products.price,
      quantity: products.quantity,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSelling,
      availability: products.availability,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy)
    .all();

  // ── Stats (across ALL active tracked products, unfiltered) ──
  const statsResult = await db
    .select({
      totalTracked: sql<number>`count(*)`,
      inStock: sql<number>`SUM(CASE WHEN ${products.quantity} >= 5 THEN 1 ELSE 0 END)`,
      lowStock: sql<number>`SUM(CASE WHEN ${products.quantity} > 0 AND ${products.quantity} < 5 THEN 1 ELSE 0 END)`,
      outOfStock: sql<number>`SUM(CASE WHEN ${products.quantity} = 0 THEN 1 ELSE 0 END)`,
      totalUnits: sql<number>`COALESCE(SUM(${products.quantity}), 0)`,
    })
    .from(products)
    .where(and(
      eq(products.status, 'active'),
      eq(products.trackInventory, true),
    ))
    .get();

  return c.json({
    products: productRows,
    stats: {
      totalTracked: statsResult?.totalTracked ?? 0,
      inStock: statsResult?.inStock ?? 0,
      lowStock: statsResult?.lowStock ?? 0,
      outOfStock: statsResult?.outOfStock ?? 0,
      totalUnits: statsResult?.totalUnits ?? 0,
    },
  });
});

// ─── PATCH /:id/stock — Update stock quantity ─────────────
inventoryRoutes.patch('/:id/stock', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { quantity, availability } = body;

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (quantity !== undefined) {
    updateData.quantity = quantity;
  }

  if (availability !== undefined) {
    updateData.availability = availability;
  }

  // Auto-availability logic
  const newQuantity = quantity ?? existing.quantity;
  if (newQuantity <= 0 && !existing.continueSelling) {
    updateData.availability = 'Sold out';
  } else if (newQuantity > 0 && existing.availability === 'Sold out') {
    updateData.availability = 'In stock';
  }

  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .run();

  const updated = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      productType: products.productType,
      status: products.status,
      price: products.price,
      quantity: products.quantity,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSelling,
      availability: products.availability,
    })
    .from(products)
    .where(eq(products.id, id))
    .get();

  return c.json(updated);
});

// ─── POST /:id/adjust — Adjust stock (add/subtract) ──────
inventoryRoutes.post('/:id/adjust', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { adjustment, reason } = body;

  if (typeof adjustment !== 'number') {
    return c.json({ error: 'adjustment must be a number' }, 400);
  }

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Calculate new quantity, don't allow below 0
  const newQuantity = Math.max(0, existing.quantity + adjustment);
  const now = new Date().toISOString();

  const updateData: Record<string, any> = {
    quantity: newQuantity,
    updatedAt: now,
  };

  // Auto-availability logic
  if (newQuantity <= 0 && !existing.continueSelling) {
    updateData.availability = 'Sold out';
  } else if (newQuantity > 0 && existing.availability === 'Sold out') {
    updateData.availability = 'In stock';
  }

  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .run();

  const updated = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      productType: products.productType,
      status: products.status,
      price: products.price,
      quantity: products.quantity,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSelling,
      availability: products.availability,
    })
    .from(products)
    .where(eq(products.id, id))
    .get();

  return c.json(updated);
});
