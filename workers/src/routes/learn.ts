import { Hono } from 'hono';
import { eq, desc, asc, sql, and, or, count } from 'drizzle-orm';
import { learnItems, workshopRevisions } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const learnRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helpers ────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureUniqueSlug(db: any, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const conditions = [eq(learnItems.slug, candidate)];
    if (excludeId) {
      conditions.push(sql`${learnItems.id} != ${excludeId}`);
    }
    const existing = await db
      .select({ id: learnItems.id })
      .from(learnItems)
      .where(and(...conditions))
      .get();

    if (!existing) {
      return candidate;
    }

    attempt++;
    if (attempt > 20) {
      return `${slug}-${Date.now()}`;
    }
  }
}

// ─── GET / — List workshops/courses (public + admin) ────

learnRoutes.get('/', async (c) => {
  const db = c.get('db');

  const {
    status,
    q,
    page,
    pageSize,
    sort = '-updatedAt',
    type,
    all: showAll,
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize || '25', 10) || 25));
  const offset = (pageNum - 1) * limit;

  // Build conditions
  const conditions = [];

  if (showAll === 'true') {
    // Admin mode: apply optional filters
    if (status && ['draft', 'scheduled', 'published', 'archived'].includes(status)) {
      conditions.push(eq(learnItems.status, status as any));
    }
  } else {
    // Public mode: only published items
    conditions.push(eq(learnItems.status, 'published'));
  }

  // Type filter
  if (type && ['ONLINE', 'WORKSHOP'].includes(type)) {
    conditions.push(eq(learnItems.type, type as any));
  }

  // Search (SQLite: LOWER + LIKE)
  if (q && q.trim()) {
    const search = `%${q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${learnItems.title}) LIKE ${search}`,
        sql`LOWER(${learnItems.summary}) LIKE ${search}`,
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Parse sort: leading '-' means descending
  const descending = sort.startsWith('-');
  const sortField = descending ? sort.slice(1) : sort;

  const sortColumn =
    sortField === 'title' ? learnItems.title
    : sortField === 'createdAt' ? learnItems.createdAt
    : sortField === 'publishedAt' ? learnItems.publishedAt
    : sortField === 'displayOrder' ? learnItems.displayOrder
    : sortField === 'startAt' ? learnItems.startAt
    : learnItems.updatedAt;

  const orderFn = descending ? desc : asc;

  const [items, countResult] = await Promise.all([
    db.select()
      .from(learnItems)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)
      .all(),
    db.select({ total: count() })
      .from(learnItems)
      .where(whereClause)
      .get(),
  ]);

  const total = countResult?.total ?? 0;

  return c.json({
    items,
    total,
    page: pageNum,
    pageSize: limit,
  });
});

// ─── GET /:idOrSlug — Get single item (public) ─────────

learnRoutes.get('/:idOrSlug', async (c) => {
  const db = c.get('db');
  const idOrSlug = c.req.param('idOrSlug');

  // Try by ID first (UUID format), then by slug
  let item = await db.select().from(learnItems).where(eq(learnItems.id, idOrSlug)).get();
  if (!item) {
    item = await db.select().from(learnItems).where(eq(learnItems.slug, idOrSlug)).get();
  }

  // Check previousSlugs if still not found
  if (!item) {
    const allItems = await db.select().from(learnItems).all();
    for (const candidate of allItems) {
      const prevSlugs: string[] = candidate.previousSlugs || [];
      if (prevSlugs.includes(idOrSlug)) {
        item = candidate;
        break;
      }
    }
  }

  if (!item) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  return c.json(item);
});

// ─── POST / — Create item (admin only) ─────────────────

learnRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.title) {
    return c.json({ error: 'title is required' }, 400);
  }

  const baseSlug = body.slug || generateSlug(body.title);
  const slug = await ensureUniqueSlug(db, baseSlug);
  const now = new Date().toISOString();

  const item = await db.insert(learnItems).values({
    title: body.title,
    slug,
    subtitle: body.subtitle || null,
    type: body.type || 'WORKSHOP',
    price: body.price || '0',
    priceAmount: body.priceAmount || null,
    currency: body.currency || 'AUD',
    image: body.image || '',
    description: body.description || null,
    duration: body.duration || null,
    format: body.format || null,
    level: body.level || null,
    nextDate: body.nextDate || null,
    enrolledCount: body.enrolledCount || 0,
    includes: body.includes || [],
    outcomes: body.outcomes || [],
    modules: body.modules || [],
    testimonial: body.testimonial || null,
    stripeProductId: body.stripeProductId || null,
    stripePriceId: body.stripePriceId || null,
    displayOrder: body.displayOrder || 0,
    archived: false,
    status: body.status || 'draft',
    summary: body.summary || null,
    contentHtml: body.contentHtml || null,
    contentJson: body.contentJson || null,
    coverImageUrl: body.coverImageUrl || null,
    capacity: body.capacity || null,
    deliveryMode: body.deliveryMode || 'online',
    locationLabel: body.locationLabel || null,
    startAt: body.startAt || null,
    endAt: body.endAt || null,
    timezone: body.timezone || 'Australia/Sydney',
    ticketingUrl: body.ticketingUrl || null,
    evergreen: body.evergreen || false,
    seoTitle: body.seoTitle || null,
    seoDescription: body.seoDescription || null,
    ogImageUrl: body.ogImageUrl || null,
    canonicalUrl: body.canonicalUrl || null,
    tags: body.tags || [],
    publishedAt: null,
    scheduledAt: null,
    previousSlugs: [],
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  await logActivity(db, 'create', 'learn_item', item, c.get('user'));

  return c.json(item, 201);
});

// ─── PUT /:id — Update item (admin only) ────────────────

learnRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const now = new Date().toISOString();

  // Save a revision before updating
  await db.insert(workshopRevisions).values({
    workshopId: id,
    title: existing.title,
    summary: existing.summary || null,
    contentHtml: existing.contentHtml || null,
    contentJson: existing.contentJson || null,
    createdBy: user?.id || null,
    savedAt: now,
  });

  // Keep max 10 revisions, delete oldest
  const allRevisions = await db
    .select({ id: workshopRevisions.id })
    .from(workshopRevisions)
    .where(eq(workshopRevisions.workshopId, id))
    .orderBy(desc(workshopRevisions.savedAt))
    .all();

  if (allRevisions.length > 10) {
    const toDelete = allRevisions.slice(10);
    for (const rev of toDelete) {
      await db.delete(workshopRevisions).where(eq(workshopRevisions.id, rev.id));
    }
  }

  // Handle slug change on a published item — save old slug to previousSlugs
  const updateData: Record<string, any> = { updatedAt: now };
  const previousSlugs: string[] = [...(existing.previousSlugs || [])];

  if (body.slug !== undefined && body.slug && body.slug !== existing.slug) {
    if (existing.status === 'published' || existing.publishedAt) {
      if (!previousSlugs.includes(existing.slug)) {
        previousSlugs.push(existing.slug);
      }
      updateData.previousSlugs = previousSlugs;
    }
    updateData.slug = body.slug;
  }

  // Copy all provided fields
  const allowedFields = [
    'title', 'subtitle', 'type', 'price', 'priceAmount', 'currency',
    'image', 'description', 'duration', 'format', 'level', 'nextDate',
    'enrolledCount', 'includes', 'outcomes', 'modules', 'testimonial',
    'stripeProductId', 'stripePriceId', 'displayOrder', 'archived',
    'status', 'summary', 'contentHtml', 'contentJson', 'coverImageUrl',
    'capacity', 'deliveryMode', 'locationLabel', 'startAt', 'endAt',
    'timezone', 'ticketingUrl', 'evergreen', 'seoTitle', 'seoDescription',
    'ogImageUrl', 'canonicalUrl', 'tags', 'publishedAt', 'scheduledAt',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const item = await db.update(learnItems)
    .set(updateData)
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'learn_item', item, user);

  return c.json(item);
});

// ─── POST /:id/publish — Publish item ──────────────────

learnRoutes.post('/:id/publish', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db.update(learnItems)
    .set({
      status: 'published',
      publishedAt: now,
      archived: false,
      scheduledAt: null,
      updatedAt: now,
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  await logActivity(db, 'publish', 'learn_item', item, user);

  return c.json(item);
});

// ─── POST /:id/unpublish — Unpublish (back to draft) ───

learnRoutes.post('/:id/unpublish', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const item = await db.update(learnItems)
    .set({
      status: 'draft',
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  await logActivity(db, 'unpublish', 'learn_item', item, user);

  return c.json(item);
});

// ─── POST /:id/schedule — Schedule item ─────────────────

learnRoutes.post('/:id/schedule', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!body.scheduledAt) {
    return c.json({ error: 'scheduledAt is required' }, 400);
  }

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const item = await db.update(learnItems)
    .set({
      status: 'scheduled',
      scheduledAt: body.scheduledAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'learn_item', item, user);

  return c.json(item);
});

// ─── POST /:id/archive — Archive item ──────────────────

learnRoutes.post('/:id/archive', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const item = await db.update(learnItems)
    .set({
      status: 'archived',
      archived: true,
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  await logActivity(db, 'archive', 'learn_item', item, user);

  return c.json(item);
});

// ─── DELETE /:id — Hard delete item ─────────────────────

learnRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  // Revisions cascade-delete automatically via FK constraint
  await db.delete(learnItems).where(eq(learnItems.id, id));

  await logActivity(db, 'delete', 'learn_item', existing, user);

  return c.json({ success: true });
});

// ─── GET /:id/revisions — List revisions ────────────────

learnRoutes.get('/:id/revisions', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const revisions = await db.select()
    .from(workshopRevisions)
    .where(eq(workshopRevisions.workshopId, id))
    .orderBy(desc(workshopRevisions.savedAt))
    .limit(10)
    .all();

  return c.json(revisions);
});

// ─── POST /:id/revisions/:revisionId/restore — Restore ─

learnRoutes.post('/:id/revisions/:revisionId/restore', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const revisionId = c.req.param('revisionId');

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const revision = await db.select()
    .from(workshopRevisions)
    .where(eq(workshopRevisions.id, revisionId))
    .get();

  if (!revision) {
    return c.json({ error: 'Revision not found' }, 404);
  }

  const item = await db.update(learnItems)
    .set({
      title: revision.title,
      summary: revision.summary,
      contentHtml: revision.contentHtml,
      contentJson: revision.contentJson,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(learnItems.id, id))
    .returning()
    .get();

  return c.json(item);
});
