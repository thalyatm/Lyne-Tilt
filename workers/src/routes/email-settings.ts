import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { siteSettings, suppressionList } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const emailSettingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const SETTINGS_KEY = 'email_settings';
const DEFAULT_SETTINGS = {
  fromName: '',
  fromEmail: '',
  replyTo: '',
  footerText: '',
};

// GET / — read email settings
emailSettingsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const row = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY)).get();

  if (!row) {
    return c.json(DEFAULT_SETTINGS);
  }

  try {
    return c.json(JSON.parse(row.value));
  } catch {
    return c.json(DEFAULT_SETTINGS);
  }
});

// PUT / — upsert email settings
emailSettingsRoutes.put('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const value = JSON.stringify({
    fromName: body.fromName || '',
    fromEmail: body.fromEmail || '',
    replyTo: body.replyTo || '',
    footerText: body.footerText || '',
  });

  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY)).get();

  if (existing) {
    await db.update(siteSettings)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(siteSettings.key, SETTINGS_KEY));
  } else {
    await db.insert(siteSettings).values({
      key: SETTINGS_KEY,
      value,
    });
  }

  return c.json({ success: true });
});

// GET /suppression — paginated suppression list
emailSettingsRoutes.get('/suppression', adminAuth, async (c) => {
  const db = c.get('db');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') || '25', 10)));
  const offset = (page - 1) * limit;

  const [entries, countResult] = await Promise.all([
    db.select().from(suppressionList).orderBy(desc(suppressionList.createdAt)).limit(limit).offset(offset).all(),
    db.select({ count: sql<number>`COUNT(*)` }).from(suppressionList).get(),
  ]);

  const total = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return c.json({ entries, total, page, totalPages });
});

// POST /suppression — add to suppression list
emailSettingsRoutes.post('/suppression', adminAuth, async (c) => {
  const db = c.get('db');
  const { email, reason } = await c.req.json();

  if (!email) return c.json({ error: 'email is required' }, 400);

  const entry = await db.insert(suppressionList).values({
    email,
    reason: reason || 'manual',
    source: 'admin',
  }).returning().get();

  return c.json(entry, 201);
});

// DELETE /suppression/:id — remove from suppression list
emailSettingsRoutes.delete('/suppression/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(suppressionList).where(eq(suppressionList.id, id));
  return c.json({ success: true });
});
