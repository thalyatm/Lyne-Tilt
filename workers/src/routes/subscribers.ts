import { Hono } from 'hono';
import { eq, desc, sql, and, like, or } from 'drizzle-orm';
import { subscribers, campaignEvents, campaigns } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { logActivity } from '../utils/activityLog';
import type { Bindings, Variables } from '../index';

export const subscribersRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── GET / — List subscribers with pagination & filters ──
subscribersRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, parseInt(c.req.query('limit') || '25'));
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || 'all';
  const source = c.req.query('source') || '';
  const tag = c.req.query('tag') || '';
  const engagement = c.req.query('engagement') || '';
  const sortField = c.req.query('sort') || 'subscribedAt';
  const order = c.req.query('order') || 'desc';

  // Build conditions
  const conditions: any[] = [];

  if (status === 'active') conditions.push(eq(subscribers.subscribed, true));
  else if (status === 'unsubscribed') conditions.push(eq(subscribers.subscribed, false));

  if (search) {
    conditions.push(
      or(
        like(sql`LOWER(${subscribers.email})`, `%${search.toLowerCase()}%`),
        like(sql`LOWER(${subscribers.name})`, `%${search.toLowerCase()}%`),
        like(sql`LOWER(${subscribers.firstName})`, `%${search.toLowerCase()}%`),
        like(sql`LOWER(${subscribers.lastName})`, `%${search.toLowerCase()}%`),
      )
    );
  }

  if (source) conditions.push(eq(subscribers.source, source));
  if (engagement) conditions.push(eq(subscribers.engagementLevel, engagement));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(subscribers)
    .where(whereClause)
    .get();
  let totalCount = countResult?.count ?? 0;

  // Get rows
  const orderBy = order === 'asc'
    ? sql`${subscribers.subscribedAt} ASC`
    : sql`${subscribers.subscribedAt} DESC`;

  let rows = await db
    .select()
    .from(subscribers)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  // Post-filter by tag (JSON array in SQLite)
  if (tag) {
    // Re-fetch all matching rows to filter by tag, then paginate
    const allRows = await db
      .select()
      .from(subscribers)
      .where(whereClause)
      .orderBy(orderBy)
      .all();

    const filtered = allRows.filter(row => {
      const tags = (row.tags as string[]) || [];
      return tags.includes(tag);
    });

    totalCount = filtered.length;
    rows = filtered.slice((page - 1) * limit, page * limit);
  }

  const totalPages = Math.ceil(totalCount / limit);

  // Map to frontend format (uses _id)
  const mapped = rows.map(row => ({
    _id: row.id,
    email: row.email,
    name: row.name || [row.firstName, row.lastName].filter(Boolean).join(' ') || undefined,
    tags: (row.tags as string[]) || [],
    source: row.source,
    status: row.subscribed ? 'active' : 'unsubscribed',
    engagement: row.engagementLevel || 'new',
    subscribedAt: row.subscribedAt,
  }));

  return c.json({
    subscribers: mapped,
    total: totalCount,
    page,
    limit,
    totalPages,
  });
});

// ─── GET /stats — Subscriber count summaries ─────────────────
subscribersRoutes.get('/stats', adminAuth, async (c) => {
  const db = c.get('db');

  const [totalResult, activeResult, unsubscribedResult, newThisMonthResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(subscribers).get(),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.subscribed, true)).get(),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.subscribed, false)).get(),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(
      and(
        eq(subscribers.subscribed, true),
        sql`${subscribers.subscribedAt} >= date('now', 'start of month')`
      )
    ).get(),
  ]);

  return c.json({
    total: totalResult?.count ?? 0,
    active: activeResult?.count ?? 0,
    unsubscribed: unsubscribedResult?.count ?? 0,
    newThisMonth: newThisMonthResult?.count ?? 0,
  });
});

// ─── POST / — Manually add a subscriber ─────────────────
subscribersRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');

  if (!body.email) return c.json({ error: 'Email is required' }, 400);

  // Check for existing
  const existing = await db.select().from(subscribers)
    .where(eq(subscribers.email, body.email.toLowerCase().trim()))
    .get();

  if (existing) return c.json({ error: 'Subscriber with this email already exists' }, 409);

  const email = body.email.toLowerCase().trim();
  await db.insert(subscribers).values({
    email,
    name: body.name || null,
    firstName: body.firstName || null,
    lastName: body.lastName || null,
    source: body.source || 'manual',
    tags: body.tags || [],
    subscribed: true,
  }).run();

  const result = await db.select().from(subscribers)
    .where(eq(subscribers.email, email)).get();

  await logActivity(db, 'create', 'subscriber', result, user);
  return c.json(result, 201);
});

// ─── GET /tags — All unique tags ─────────────────────────
subscribersRoutes.get('/tags', adminAuth, async (c) => {
  const db = c.get('db');
  const rows = await db.select({ tags: subscribers.tags }).from(subscribers).all();
  const allTags = new Set<string>();
  for (const row of rows) {
    const tags = (row.tags as string[]) || [];
    tags.forEach(t => allTags.add(t));
  }
  return c.json([...allTags].sort());
});

// ─── GET /sources — All unique sources ───────────────────
subscribersRoutes.get('/sources', adminAuth, async (c) => {
  const db = c.get('db');
  const rows = await db
    .select({ source: subscribers.source })
    .from(subscribers)
    .groupBy(subscribers.source)
    .all();
  return c.json(rows.map(r => r.source).filter(Boolean).sort());
});

// ─── GET /export — CSV export ────────────────────────────
subscribersRoutes.get('/export', adminAuth, async (c) => {
  const db = c.get('db');
  const rows = await db.select().from(subscribers).orderBy(desc(subscribers.subscribedAt)).all();

  const header = 'email,name,first_name,last_name,source,tags,subscribed,subscribed_at,engagement_level';
  const lines = rows.map(r => {
    const tags = ((r.tags as string[]) || []).join(';');
    return [
      r.email,
      r.name || '',
      r.firstName || '',
      r.lastName || '',
      r.source || '',
      tags,
      r.subscribed ? 'active' : 'unsubscribed',
      r.subscribedAt || '',
      r.engagementLevel || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [header, ...lines].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── POST /bulk-action — Bulk tag/unsubscribe/delete ─────
subscribersRoutes.post('/bulk-action', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');
  const { ids, action, tag: tagName } = body as { ids: string[]; action: string; tag?: string };

  if (!ids?.length) return c.json({ error: 'No subscribers selected' }, 400);

  let affected = 0;

  for (const id of ids) {
    const sub = await db.select().from(subscribers).where(eq(subscribers.id, id)).get();
    if (!sub) continue;

    const currentTags = (sub.tags as string[]) || [];

    if (action === 'add_tag' && tagName) {
      if (!currentTags.includes(tagName)) {
        await db.update(subscribers)
          .set({ tags: [...currentTags, tagName], updatedAt: new Date().toISOString() })
          .where(eq(subscribers.id, id));
        affected++;
      }
    } else if (action === 'remove_tag' && tagName) {
      if (currentTags.includes(tagName)) {
        await db.update(subscribers)
          .set({ tags: currentTags.filter(t => t !== tagName), updatedAt: new Date().toISOString() })
          .where(eq(subscribers.id, id));
        affected++;
      }
    } else if (action === 'unsubscribe') {
      await db.update(subscribers)
        .set({ subscribed: false, unsubscribedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(subscribers.id, id));
      affected++;
    } else if (action === 'delete') {
      await db.delete(subscribers).where(eq(subscribers.id, id));
      affected++;
    }
  }

  await logActivity(db, action === 'delete' ? 'delete' : 'update', 'subscriber',
    { id: 'bulk', name: `${affected} subscribers — ${action}` }, user);

  return c.json({ success: true, affected });
});

// ─── GET /:id — Single subscriber detail ─────────────────
subscribersRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const sub = await db.select().from(subscribers).where(eq(subscribers.id, id)).get();
  if (!sub) return c.json({ error: 'Subscriber not found' }, 404);

  return c.json(sub);
});

// ─── PUT /:id — Update subscriber ────────────────────────
subscribersRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user');

  const existing = await db.select().from(subscribers).where(eq(subscribers.id, id)).get();
  if (!existing) return c.json({ error: 'Subscriber not found' }, 404);

  await db.update(subscribers)
    .set({
      email: body.email ?? existing.email,
      name: body.name !== undefined ? body.name : existing.name,
      firstName: body.firstName !== undefined ? body.firstName : existing.firstName,
      lastName: body.lastName !== undefined ? body.lastName : existing.lastName,
      source: body.source ?? existing.source,
      tags: body.tags ?? existing.tags,
      subscribed: body.subscribed !== undefined ? body.subscribed : existing.subscribed,
      unsubscribedAt: body.subscribed === false ? (existing.unsubscribedAt || new Date().toISOString()) : existing.unsubscribedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscribers.id, id))
    .run();

  const updated = await db.select().from(subscribers)
    .where(eq(subscribers.id, id)).get();

  await logActivity(db, 'update', 'subscriber', updated, user);
  return c.json(updated);
});

// ─── DELETE /:id — Delete subscriber ─────────────────────
subscribersRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await db.select().from(subscribers).where(eq(subscribers.id, id)).get();
  if (!existing) return c.json({ error: 'Subscriber not found' }, 404);

  await db.delete(subscribers).where(eq(subscribers.id, id));
  await logActivity(db, 'delete', 'subscriber', existing, user);

  return c.json({ success: true });
});

// ─── GET /:id/events — Subscriber's campaign events ──────
subscribersRoutes.get('/:id/events', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, parseInt(c.req.query('limit') || '50'));

  const sub = await db.select().from(subscribers).where(eq(subscribers.id, id)).get();
  if (!sub) return c.json({ error: 'Subscriber not found' }, 404);

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(campaignEvents)
    .where(eq(campaignEvents.email, sub.email))
    .get();
  const total = countResult?.count ?? 0;

  const events = await db
    .select({
      id: campaignEvents.id,
      campaignId: campaignEvents.campaignId,
      eventType: campaignEvents.eventType,
      metadata: campaignEvents.metadata,
      createdAt: campaignEvents.createdAt,
    })
    .from(campaignEvents)
    .where(eq(campaignEvents.email, sub.email))
    .orderBy(desc(campaignEvents.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  // Resolve campaign subjects
  const campaignIds = [...new Set(events.map(e => e.campaignId))];
  const campaignMap = new Map<string, string>();
  if (campaignIds.length > 0) {
    const campaignRows = await db.select({ id: campaigns.id, subject: campaigns.subject })
      .from(campaigns)
      .where(sql`${campaigns.id} IN (${sql.join(campaignIds.map(cid => sql`${cid}`), sql`, `)})`)
      .all();
    for (const row of campaignRows) {
      campaignMap.set(row.id, row.subject);
    }
  }

  const mapped = events.map(e => ({
    id: e.id,
    campaignId: e.campaignId,
    campaignSubject: campaignMap.get(e.campaignId) || 'Unknown Campaign',
    eventType: e.eventType,
    metadata: e.metadata || {},
    createdAt: e.createdAt,
  }));

  return c.json({
    events: mapped,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
