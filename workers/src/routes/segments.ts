import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { segments } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const segmentsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list all segments
segmentsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const result = await db.select().from(segments).orderBy(desc(segments.createdAt)).all();
  return c.json({ segments: result });
});

// DELETE /:id — delete segment
segmentsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(segments).where(eq(segments.id, id));
  return c.json({ success: true });
});
