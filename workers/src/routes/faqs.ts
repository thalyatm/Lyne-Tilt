import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { faqs } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const faqsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/faqs - List FAQs (public)
faqsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const category = c.req.query('category');
  const all = c.req.query('all') === 'true';

  let result;
  if (all) {
    result = await db.select().from(faqs).orderBy(faqs.displayOrder).all();
  } else if (category) {
    result = await db.select().from(faqs)
      .where(eq(faqs.category, category as any))
      .orderBy(faqs.displayOrder)
      .all();
  } else {
    result = await db.select().from(faqs)
      .where(eq(faqs.published, true))
      .orderBy(faqs.displayOrder)
      .all();
  }

  return c.json(result);
});

// POST /api/faqs - Create FAQ (admin only)
faqsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const faq = await db.insert(faqs).values({
    question: body.question,
    answer: body.answer,
    category: body.category,
    displayOrder: body.displayOrder || 0,
    published: body.published ?? true,
  }).returning().get();

  await logActivity(db, 'create', 'faq', faq, c.get('user'));

  return c.json(faq, 201);
});

// PUT /api/faqs/:id - Update FAQ (admin only)
faqsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const faq = await db.update(faqs)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(faqs.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'faq', faq, c.get('user'));

  return c.json(faq);
});

// DELETE /api/faqs/:id - Delete FAQ (admin only)
faqsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(faqs).where(eq(faqs.id, id)).get();
  await db.delete(faqs).where(eq(faqs.id, id));

  if (existing) {
    await logActivity(db, 'delete', 'faq', existing, c.get('user'));
  }

  return c.json({ success: true });
});
