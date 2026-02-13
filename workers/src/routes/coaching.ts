import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { coachingPackages } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const coachingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/coaching - List packages (public)
coachingRoutes.get('/', async (c) => {
  const db = c.get('db');
  const all = c.req.query('all') === 'true';

  let result;
  if (all) {
    result = await db.select().from(coachingPackages).orderBy(coachingPackages.displayOrder).all();
  } else {
    result = await db.select().from(coachingPackages)
      .where(eq(coachingPackages.archived, false))
      .orderBy(coachingPackages.displayOrder)
      .all();
  }

  return c.json(result);
});

// GET /api/coaching/:slug - Get single package (public)
coachingRoutes.get('/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');

  const pkg = await db.select().from(coachingPackages).where(eq(coachingPackages.slug, slug)).get();

  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404);
  }

  return c.json(pkg);
});

// POST /api/coaching - Create package (admin only)
coachingRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const pkg = await db.insert(coachingPackages).values({
    title: body.title,
    slug: slug,
    description: body.description,
    features: body.features || [],
    ctaText: body.ctaText || 'Apply Now',
    image: body.image,
    price: body.price,
    priceAmount: body.priceAmount,
    currency: body.currency || 'AUD',
    recurring: body.recurring || false,
    recurringInterval: body.recurringInterval,
    badge: body.badge,
    displayOrder: body.displayOrder || 0,
  }).returning().get();

  return c.json(pkg, 201);
});

// PUT /api/coaching/:id - Update package (admin only)
coachingRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const pkg = await db.update(coachingPackages)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  return c.json(pkg);
});

// DELETE /api/coaching/:id - Archive package (admin only)
coachingRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.update(coachingPackages)
    .set({ archived: true, updatedAt: new Date().toISOString() })
    .where(eq(coachingPackages.id, id));

  return c.json({ success: true });
});
