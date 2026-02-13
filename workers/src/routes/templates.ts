import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { emailTemplates } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const templatesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list all templates sorted by isDefault desc, updatedAt desc
templatesRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const result = await db.select().from(emailTemplates)
    .orderBy(desc(emailTemplates.isDefault), desc(emailTemplates.updatedAt))
    .all();
  return c.json(result);
});

// GET /:id — get single template
templatesRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get();
  if (!template) return c.json({ error: 'Template not found' }, 404);
  return c.json(template);
});

// POST / — create new template
templatesRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const template = await db.insert(emailTemplates).values({
    name: body.name,
    description: body.description || '',
    blocks: body.blocks || [],
    category: body.category || 'Custom',
    isDefault: false,
  }).returning().get();

  return c.json(template, 201);
});

// PUT /:id — update existing template
templatesRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get();
  if (!existing) return c.json({ error: 'Template not found' }, 404);

  const template = await db.update(emailTemplates)
    .set({
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      blocks: body.blocks ?? existing.blocks,
      category: body.category ?? existing.category,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(emailTemplates.id, id))
    .returning()
    .get();

  return c.json(template);
});

// POST /seed — seed default templates if none exist
templatesRoutes.post('/seed', adminAuth, async (c) => {
  const db = c.get('db');

  const existing = await db.select({ count: sql<number>`COUNT(*)` }).from(emailTemplates).get();
  if (existing && existing.count > 0) {
    return c.json({ message: 'Templates already exist', seeded: 0 });
  }

  const defaults = [
    {
      name: 'Welcome Email',
      description: 'Sent to new subscribers when they join your mailing list',
      category: 'Onboarding',
      isDefault: true,
      blocks: [
        { type: 'heading', content: 'Welcome to Lyne Tilt!' },
        { type: 'text', content: 'Thank you for subscribing. We are excited to have you on board.' },
        { type: 'button', content: 'Visit Our Shop', url: '/' },
      ],
    },
    {
      name: 'Newsletter',
      description: 'Standard newsletter layout with featured content sections',
      category: 'Newsletter',
      isDefault: true,
      blocks: [
        { type: 'heading', content: 'Monthly Newsletter' },
        { type: 'text', content: 'Here is what has been happening this month.' },
        { type: 'divider' },
        { type: 'text', content: 'Featured content goes here.' },
      ],
    },
    {
      name: 'Product Announcement',
      description: 'Announce new products or collections to your audience',
      category: 'Marketing',
      isDefault: true,
      blocks: [
        { type: 'heading', content: 'New Arrival' },
        { type: 'image', src: '', alt: 'Product image' },
        { type: 'text', content: 'Check out our latest addition.' },
        { type: 'button', content: 'Shop Now', url: '/shop' },
      ],
    },
    {
      name: 'Order Confirmation',
      description: 'Sent after a successful purchase',
      category: 'Transactional',
      isDefault: true,
      blocks: [
        { type: 'heading', content: 'Order Confirmed' },
        { type: 'text', content: 'Thank you for your purchase! Your order details are below.' },
      ],
    },
    {
      name: 'Event Invitation',
      description: 'Invite subscribers to workshops, exhibitions, or events',
      category: 'Events',
      isDefault: true,
      blocks: [
        { type: 'heading', content: 'You are Invited' },
        { type: 'text', content: 'Join us for an upcoming event.' },
        { type: 'button', content: 'RSVP Now', url: '/learn' },
      ],
    },
  ];

  for (const tpl of defaults) {
    await db.insert(emailTemplates).values(tpl);
  }

  return c.json({ message: 'Default templates seeded', seeded: defaults.length });
});

// POST /:id/duplicate — deep copy a template
templatesRoutes.post('/:id/duplicate', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const original = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get();
  if (!original) return c.json({ error: 'Template not found' }, 404);

  const copy = await db.insert(emailTemplates).values({
    name: `${original.name} (Copy)`,
    description: original.description,
    category: original.category,
    isDefault: false,
    blocks: original.blocks,
    thumbnail: original.thumbnail,
  }).returning().get();

  return c.json(copy, 201);
});

// DELETE /:id — delete template (reject if isDefault)
templatesRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get();
  if (!template) return c.json({ error: 'Template not found' }, 404);
  if (template.isDefault) return c.json({ error: 'Cannot delete a default template' }, 400);

  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  return c.json({ success: true });
});
