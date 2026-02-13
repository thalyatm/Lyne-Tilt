import { Router, Request, Response } from 'express';
import { eq, desc, gte, sql } from 'drizzle-orm';
import { db, activityLog } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get activity log with optional filters
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { action, entityType, limit = '50', offset = '0' } = req.query;

  let query = db.select().from(activityLog);

  // Build conditions array
  const conditions: any[] = [];

  if (action && typeof action === 'string') {
    conditions.push(eq(activityLog.action, action as any));
  }

  if (entityType && typeof entityType === 'string') {
    conditions.push(sql`lower(${activityLog.entityType}) = ${entityType.toLowerCase()}`);
  }

  // Apply conditions if any
  if (conditions.length > 0) {
    // For single condition
    if (conditions.length === 1) {
      query = query.where(conditions[0]) as any;
    }
    // For multiple conditions, we'd need to use and()
  }

  // Get total count for pagination
  const allActivities = await db.select().from(activityLog);
  let filteredActivities = allActivities;

  if (action && typeof action === 'string') {
    filteredActivities = filteredActivities.filter(a => a.action === action);
  }
  if (entityType && typeof entityType === 'string') {
    filteredActivities = filteredActivities.filter(a => a.entityType.toLowerCase() === entityType.toLowerCase());
  }

  const total = filteredActivities.length;

  // Sort by most recent first
  filteredActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate
  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);
  const activities = filteredActivities.slice(offsetNum, offsetNum + limitNum);

  res.json({
    activities,
    total,
    limit: limitNum,
    offset: offsetNum,
  });
});

// Get activity stats
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  const activities = await db.select().from(activityLog);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayActivities = activities.filter(a => new Date(a.createdAt) >= today);
  const weekActivities = activities.filter(a => new Date(a.createdAt) >= thisWeek);

  // Count by action type
  const actionCounts = activities.reduce((acc, a) => {
    acc[a.action] = (acc[a.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by entity type
  const entityCounts = activities.reduce((acc, a) => {
    acc[a.entityType] = (acc[a.entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    total: activities.length,
    today: todayActivities.length,
    thisWeek: weekActivities.length,
    byAction: actionCounts,
    byEntity: entityCounts,
  });
});

export default router;

// Helper function to log an activity (for use in other routes)
export async function logActivity(entry: {
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'send';
  entityType: string;
  entityId: string;
  entityName?: string;
  userId?: string;
  userName?: string;
  details?: string;
  metadata?: any;
}) {
  try {
    const result = await db.insert(activityLog).values({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName || null,
      userId: entry.userId || null,
      userName: entry.userName || null,
      details: entry.details || null,
      metadata: entry.metadata || null,
      createdAt: new Date(),
    }).returning();

    return result[0];
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}
