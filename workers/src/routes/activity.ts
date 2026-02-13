import { Hono } from 'hono';
import { desc, eq, sql, and } from 'drizzle-orm';
import { activityLog } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const activityRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/activity — List activities with optional filters
activityRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const action = c.req.query('action');
  const entityType = c.req.query('entityType');
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);

  const conditions = [];
  if (action) conditions.push(eq(activityLog.action, action as any));
  if (entityType) conditions.push(eq(activityLog.entityType, entityType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const activities = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      entityName: activityLog.entityName,
      userId: activityLog.userId,
      userName: activityLog.userName,
      details: activityLog.details,
      changedFields: activityLog.changedFields,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(whereClause)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .all();

  return c.json({ activities });
});

// GET /api/activity/stats — Activity statistics
activityRoutes.get('/stats', adminAuth, async (c) => {
  const db = c.get('db');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, todayResult, weekResult, byActionResult, byEntityResult] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(activityLog).get(),
    db.select({ count: sql<number>`COUNT(*)` }).from(activityLog)
      .where(sql`${activityLog.createdAt} >= ${todayStart}`).get(),
    db.select({ count: sql<number>`COUNT(*)` }).from(activityLog)
      .where(sql`${activityLog.createdAt} >= ${weekStart}`).get(),
    db.select({
      action: activityLog.action,
      count: sql<number>`COUNT(*)`,
    }).from(activityLog).groupBy(activityLog.action).all(),
    db.select({
      entityType: activityLog.entityType,
      count: sql<number>`COUNT(*)`,
    }).from(activityLog).groupBy(activityLog.entityType).all(),
  ]);

  const byAction: Record<string, number> = {};
  for (const row of byActionResult) {
    byAction[row.action] = row.count;
  }

  const byEntity: Record<string, number> = {};
  for (const row of byEntityResult) {
    byEntity[row.entityType] = row.count;
  }

  return c.json({
    total: totalResult?.count || 0,
    today: todayResult?.count || 0,
    thisWeek: weekResult?.count || 0,
    byAction,
    byEntity,
  });
});
