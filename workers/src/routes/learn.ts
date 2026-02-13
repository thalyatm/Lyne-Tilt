import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { learnItems } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const learnRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/learn - List items (public)
learnRoutes.get('/', async (c) => {
  const db = c.get('db');
  const all = c.req.query('all') === 'true';

  let result;
  if (all) {
    result = await db.select().from(learnItems).orderBy(learnItems.displayOrder).all();
  } else {
    result = await db.select().from(learnItems)
      .where(eq(learnItems.archived, false))
      .orderBy(learnItems.displayOrder)
      .all();
  }

  return c.json(result);
});

// GET /api/learn/:slug - Get single item (public)
learnRoutes.get('/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');

  const item = await db.select().from(learnItems).where(eq(learnItems.slug, slug)).get();

  if (!item) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  return c.json(item);
});

// POST /api/learn - Create item (admin only)
learnRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const item = await db.insert(learnItems).values({
    title: body.title,
    slug: slug,
    subtitle: body.subtitle,
    type: body.type || 'ONLINE',
    price: body.price,
    priceAmount: body.priceAmount,
    currency: body.currency || 'AUD',
    image: body.image,
    description: body.description,
    duration: body.duration,
    format: body.format,
    level: body.level,
    nextDate: body.nextDate,
    enrolledCount: body.enrolledCount || 0,
    includes: body.includes || [],
    outcomes: body.outcomes || [],
    modules: body.modules || [],
    testimonial: body.testimonial,
    displayOrder: body.displayOrder || 0,
  }).returning().get();

  return c.json(item, 201);
});

// PUT /api/learn/:id - Update item (admin only)
learnRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const item = await db.update(learnItems)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  return c.json(item);
});

// DELETE /api/learn/:id - Archive item (admin only)
learnRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.update(learnItems)
    .set({ archived: true, updatedAt: new Date().toISOString() })
    .where(eq(learnItems.id, id));

  return c.json({ success: true });
});
