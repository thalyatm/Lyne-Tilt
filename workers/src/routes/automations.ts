import { Hono } from 'hono';
import { eq, desc, sql, and } from 'drizzle-orm';
import { emailAutomations, automationQueue } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { triggerAutomation } from '../utils/automations';
import type { Bindings, Variables } from '../index';

export const automationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list all automations
automationsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const result = await db.select().from(emailAutomations).orderBy(desc(emailAutomations.createdAt)).all();
  return c.json(result);
});

// GET /queue/stats — counts by status (must be before /:id)
automationsRoutes.get('/queue/stats', adminAuth, async (c) => {
  const db = c.get('db');
  const stats = await db.select({
    status: automationQueue.status,
    count: sql<number>`COUNT(*)`,
  }).from(automationQueue).groupBy(automationQueue.status).all();

  const result = { scheduled: 0, sent: 0, failed: 0, cancelled: 0 };
  for (const row of stats) {
    if (row.status in result) result[row.status as keyof typeof result] = row.count;
  }
  return c.json(result);
});

// GET /queue — list queue items
automationsRoutes.get('/queue', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');
  const automationId = c.req.query('automationId');

  let result;
  const conditions = [];
  if (status) conditions.push(eq(automationQueue.status, status as any));
  if (automationId) conditions.push(eq(automationQueue.automationId, automationId));

  if (conditions.length > 0) {
    result = await db.select().from(automationQueue).where(and(...conditions)).orderBy(desc(automationQueue.createdAt)).all();
  } else {
    result = await db.select().from(automationQueue).orderBy(desc(automationQueue.createdAt)).all();
  }
  return c.json(result);
});

// GET /:id — get single automation
automationsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const result = await db.select().from(emailAutomations).where(eq(emailAutomations.id, id)).get();
  if (!result) return c.json({ error: 'Automation not found' }, 404);
  return c.json(result);
});

// POST / — create automation
automationsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const { name, description, trigger, steps } = await c.req.json();

  if (!name) return c.json({ error: 'name is required' }, 400);

  const result = await db.insert(emailAutomations).values({
    name,
    description: description || null,
    trigger: trigger || 'manual',
    steps: steps || [],
    status: 'paused',
  }).returning().get();

  return c.json(result, 201);
});

// PUT /:id — update automation
automationsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { name, description, trigger, steps } = await c.req.json();

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (trigger !== undefined) updates.trigger = trigger;
  if (steps !== undefined) updates.steps = steps;

  const result = await db.update(emailAutomations).set(updates).where(eq(emailAutomations.id, id)).returning().get();
  if (!result) return c.json({ error: 'Automation not found' }, 404);
  return c.json(result);
});

// PATCH /:id/status — toggle active/paused
automationsRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status } = await c.req.json();

  if (!status || !['active', 'paused'].includes(status)) {
    return c.json({ error: 'status must be "active" or "paused"' }, 400);
  }

  const result = await db.update(emailAutomations)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(emailAutomations.id, id))
    .returning().get();

  if (!result) return c.json({ error: 'Automation not found' }, 404);

  // When pausing, cancel all pending queue items
  if (status === 'paused') {
    await db.update(automationQueue)
      .set({ status: 'cancelled' })
      .where(and(
        eq(automationQueue.automationId, id),
        eq(automationQueue.status, 'scheduled')
      ));
  }

  return c.json(result);
});

// DELETE /:id — delete automation
automationsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(emailAutomations).where(eq(emailAutomations.id, id));
  return c.json({ success: true });
});

// POST /:id/trigger — manually trigger for a recipient email
automationsRoutes.post('/:id/trigger', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { email, name } = await c.req.json();

  if (!email) return c.json({ error: 'email is required' }, 400);

  const automation = await db.select().from(emailAutomations).where(eq(emailAutomations.id, id)).get();
  if (!automation) return c.json({ error: 'Automation not found' }, 404);

  await triggerAutomation(db, automation.trigger, email, name);

  const steps = (automation.steps || []) as any[];
  return c.json({ success: true, stepsQueued: steps.length });
});
