import { activityLog } from '../db/schema';

/**
 * Shared activity logging helper.
 * Inserts a row into the activity_log table after any admin mutation.
 */
export async function logActivity(
  db: any,
  action: string,
  entityType: string,
  entity: any,
  user: any,
  changedFields?: Record<string, { old: unknown; new: unknown }> | null,
) {
  const entityName =
    entity.name || entity.title || entity.question || entity.author ||
    entity.subject || entity.email || entity.key || null;

  await db.insert(activityLog).values({
    action,
    entityType,
    entityId: entity.id,
    entityName,
    userId: user?.id,
    userName: user?.name,
    changedFields: changedFields || null,
    entitySnapshot: entity,
  });
}
