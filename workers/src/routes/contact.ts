import { Hono } from 'hono';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { contactSubmissions } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { triggerAutomation } from '../utils/automations';
import type { Bindings, Variables } from '../index';

export const contactRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/contact - Submit contact form (public)
contactRoutes.post('/', async (c) => {
  const db = c.get('db');
  const { name, email, subject, message } = await c.req.json();

  if (!name || !email || !subject || !message) {
    return c.json({ error: 'All fields are required' }, 400);
  }

  const submission = await db.insert(contactSubmissions).values({
    name,
    email,
    subject,
    message,
    status: 'unread',
  }).returning().get();

  await triggerAutomation(db, 'contact_form', email, name);

  return c.json({ success: true, id: submission.id }, 201);
});

// GET /api/contact - List submissions (admin only)
contactRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');

  let result;
  if (status) {
    result = await db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.status, status as any))
      .orderBy(desc(contactSubmissions.createdAt))
      .all();
  } else {
    result = await db.select().from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .all();
  }

  return c.json(result);
});

// PUT /api/contact/:id - Update submission status (admin only)
contactRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status, notes } = await c.req.json();

  const updates: any = {};
  if (status) {
    updates.status = status;
    if (status === 'read') updates.readAt = new Date().toISOString();
  }
  if (notes !== undefined) updates.notes = notes;

  const result = await db.update(contactSubmissions)
    .set(updates)
    .where(eq(contactSubmissions.id, id))
    .returning()
    .get();

  return c.json(result);
});

// GET /api/contact/unread-count - Count unread submissions (admin only)
contactRoutes.get('/unread-count', adminAuth, async (c) => {
  const db = c.get('db');

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, 'unread'))
    .get();

  return c.json({ count: result?.count ?? 0 });
});

// PATCH /api/contact/bulk/status - Bulk update submission statuses (admin only)
contactRoutes.patch('/bulk/status', adminAuth, async (c) => {
  const db = c.get('db');
  const { ids, status } = await c.req.json<{ ids: string[]; status: 'read' | 'archived' }>();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids array is required' }, 400);
  }
  if (!status || !['read', 'archived'].includes(status)) {
    return c.json({ error: 'status must be "read" or "archived"' }, 400);
  }

  const updates: Record<string, any> = { status };
  if (status === 'read') {
    updates.readAt = new Date().toISOString();
  }

  await db.update(contactSubmissions)
    .set(updates)
    .where(inArray(contactSubmissions.id, ids));

  return c.json({ success: true, updated: ids.length });
});

// PATCH /api/contact/:id/status - Update single submission status (admin only)
contactRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status } = await c.req.json<{ status: 'unread' | 'read' | 'archived' }>();

  if (!status || !['unread', 'read', 'archived'].includes(status)) {
    return c.json({ error: 'status must be "unread", "read", or "archived"' }, 400);
  }

  const updates: Record<string, any> = { status };
  if (status === 'read') {
    updates.readAt = new Date().toISOString();
  }

  const result = await db.update(contactSubmissions)
    .set(updates)
    .where(eq(contactSubmissions.id, id))
    .returning()
    .get();

  if (!result) {
    return c.json({ error: 'Submission not found' }, 404);
  }

  return c.json(result);
});

// DELETE /api/contact/:id - Delete submission (admin only)
contactRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));

  return c.json({ success: true });
});
