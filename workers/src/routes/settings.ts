import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { siteSettings } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const settingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Handler for public settings
const getPublicSettings = async (c: any) => {
  const db = c.get('db');

  const settings = await db.select().from(siteSettings).all();

  // Convert array to object keyed by setting key, parsing JSON values
  const result: Record<string, any> = {};
  for (const setting of settings) {
    try {
      result[setting.key] = JSON.parse(setting.value);
    } catch {
      result[setting.key] = setting.value;
    }
  }

  return c.json(result);
};

// GET /api/settings - Get all public settings (no auth required)
settingsRoutes.get('/', getPublicSettings);

// GET /api/settings/public - Alias for public settings
settingsRoutes.get('/public', getPublicSettings);

// GET /api/settings/:key - Get specific setting (admin only)
settingsRoutes.get('/key/:key', adminAuth, async (c) => {
  const db = c.get('db');
  const key = c.req.param('key');

  const setting = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();

  if (!setting) {
    return c.json({ error: 'Setting not found' }, 404);
  }

  return c.json(setting);
});

// PUT /api/settings - Bulk update all settings (admin only)
settingsRoutes.put('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');
  const now = new Date().toISOString();

  const entries = Object.entries(body);

  for (const [key, value] of entries) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();

    if (existing) {
      await db.update(siteSettings)
        .set({
          value: serialized,
          updatedAt: now,
          updatedBy: user?.id,
        })
        .where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings)
        .values({
          key,
          value: serialized,
          updatedAt: now,
          updatedBy: user?.id,
        });
    }
  }

  await logActivity(db, 'update', 'site_setting', { id: 'bulk', key: `${entries.length} settings` }, user);

  return c.json({ success: true, updated: entries.length });
});

// PUT /api/settings/key/:key - Update setting (admin only)
settingsRoutes.put('/key/:key', adminAuth, async (c) => {
  const db = c.get('db');
  const key = c.req.param('key');
  const body = await c.req.json();
  const user = c.get('user');

  // Check if setting exists
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();

  if (existing) {
    // Update
    const result = await db.update(siteSettings)
      .set({
        value: body.value,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id,
      })
      .where(eq(siteSettings.key, key))
      .returning()
      .get();

    return c.json(result);
  } else {
    // Create
    const result = await db.insert(siteSettings)
      .values({
        key: key,
        value: body.value,
        updatedBy: user?.id,
      })
      .returning()
      .get();

    return c.json(result, 201);
  }
});
