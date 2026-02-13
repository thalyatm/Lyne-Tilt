import { Hono } from 'hono';
import { eq, desc, and, isNull, asc } from 'drizzle-orm';
import { products } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

// Backward-compatibility proxy: reads from unified products table with productType='wall-art'
// This will be removed in Phase 2.
export const wallArtRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/wall-art - List all wall art products (public)
wallArtRoutes.get('/', async (c) => {
  const db = c.get('db');
  const category = c.req.query('category');

  const conditions: any[] = [
    eq(products.productType, 'wall-art'),
    eq(products.status, 'active'),
    isNull(products.deletedAt),
  ];

  if (category) {
    conditions.push(eq(products.category, category));
  }

  const result = await db.select().from(products)
    .where(and(...conditions))
    .orderBy(asc(products.displayOrder), desc(products.createdAt))
    .all();

  return c.json(result);
});

// GET /api/wall-art/:id - Get single wall art product (public)
wallArtRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  // Try by ID then slug
  let product = await db.select().from(products)
    .where(and(
      eq(products.id, id),
      eq(products.productType, 'wall-art'),
      isNull(products.deletedAt),
    )).get();

  if (!product) {
    product = await db.select().from(products)
      .where(and(
        eq(products.slug, id),
        eq(products.productType, 'wall-art'),
        isNull(products.deletedAt),
      )).get();
  }

  if (!product) {
    return c.json({ error: 'Wall art product not found' }, 404);
  }

  return c.json(product);
});

// POST /api/wall-art - Create wall art product (admin only)
// Proxies to unified products table
wallArtRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const result = await db.insert(products).values({
    productType: 'wall-art',
    name: body.name,
    slug,
    price: body.price,
    currency: body.currency || 'AUD',
    category: body.category,
    shortDescription: body.shortDescription,
    longDescription: body.longDescription,
    dimensions: body.dimensions,
    image: body.image,
    detailImages: body.detailImages || [],
    badge: body.badge,
    availability: body.availability || 'In stock',
    displayOrder: body.displayOrder || 0,
    status: 'active',
  }).returning().get();

  return c.json(result, 201);
});

// PUT /api/wall-art/:id - Update wall art product (admin only)
wallArtRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const result = await db.update(products)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(products.id, id), eq(products.productType, 'wall-art')))
    .returning()
    .get();

  if (!result) {
    return c.json({ error: 'Wall art product not found' }, 404);
  }

  return c.json(result);
});

// DELETE /api/wall-art/:id - Archive wall art product (admin only)
wallArtRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.update(products)
    .set({ archived: true, status: 'archived', updatedAt: new Date().toISOString() })
    .where(and(eq(products.id, id), eq(products.productType, 'wall-art')));

  return c.json({ success: true });
});
