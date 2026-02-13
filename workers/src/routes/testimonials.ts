import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { testimonials } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const testimonialsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/testimonials - List testimonials (public)
testimonialsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const type = c.req.query('type');
  const all = c.req.query('all') === 'true';

  let result;
  if (all) {
    result = await db.select().from(testimonials).orderBy(testimonials.displayOrder).all();
  } else if (type) {
    result = await db.select().from(testimonials)
      .where(eq(testimonials.type, type as any))
      .orderBy(testimonials.displayOrder)
      .all();
  } else {
    result = await db.select().from(testimonials)
      .where(eq(testimonials.published, true))
      .orderBy(testimonials.displayOrder)
      .all();
  }

  return c.json(result);
});

// POST /api/testimonials - Create testimonial (admin only)
testimonialsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const testimonial = await db.insert(testimonials).values({
    text: body.text,
    author: body.author,
    role: body.role,
    type: body.type,
    rating: body.rating || 5,
    image: body.image,
    displayOrder: body.displayOrder || 0,
    published: body.published ?? true,
  }).returning().get();

  return c.json(testimonial, 201);
});

// PUT /api/testimonials/:id - Update testimonial (admin only)
testimonialsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const testimonial = await db.update(testimonials)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(testimonials.id, id))
    .returning()
    .get();

  return c.json(testimonial);
});

// DELETE /api/testimonials/:id - Delete testimonial (admin only)
testimonialsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(testimonials).where(eq(testimonials.id, id));

  return c.json({ success: true });
});
