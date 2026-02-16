import { Hono } from 'hono';
import { eq, desc, asc, sql, and, or, count } from 'drizzle-orm';
import { coachingPackages, coachingRevisions, coachingApplications } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { triggerAutomation } from '../utils/automations';
import { adminAuth, optionalAdminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const coachingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helpers ────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Ensure slug is unique — appends -1, -2, etc. if the base slug is taken. */
async function ensureUniqueSlug(db: any, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db
      .select({ id: coachingPackages.id })
      .from(coachingPackages)
      .where(
        excludeId
          ? and(eq(coachingPackages.slug, candidate), sql`${coachingPackages.id} != ${excludeId}`)
          : eq(coachingPackages.slug, candidate)
      )
      .get();

    if (!existing) return candidate;

    attempt++;
    if (attempt > 20) {
      return `${slug}-${Date.now()}`;
    }
  }
}

/** Auto-publish scheduled coaching offers whose scheduledAt has passed. */
async function autoPublishScheduled(db: any) {
  const now = new Date().toISOString();
  await db
    .update(coachingPackages)
    .set({
      status: 'published',
      archived: false,
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(coachingPackages.status, 'scheduled'),
        sql`${coachingPackages.scheduledAt} <= ${now}`
      )
    );
}

// ─── GET / — List coaching offers (public + admin) ──────

coachingRoutes.get('/', optionalAdminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  await autoPublishScheduled(db);

  const {
    status,
    q,
    page,
    pageSize,
    sort = '-updatedAt',
    all: showAll,
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize || '25', 10) || 25));
  const offset = (pageNum - 1) * limit;

  // Build conditions
  const conditions = [];

  if (!user || showAll !== 'true') {
    // Public visitors or admin without ?all=true: only published
    if (!user) {
      conditions.push(eq(coachingPackages.status, 'published'));
    }
  }

  // Admin with ?all=true can filter by status
  if (user && showAll === 'true') {
    if (status && ['draft', 'scheduled', 'published', 'archived'].includes(status)) {
      conditions.push(eq(coachingPackages.status, status as any));
    }
  } else if (user && !showAll) {
    // Authenticated admin without all=true: still only published
    conditions.push(eq(coachingPackages.status, 'published'));
  }

  // Search (case-insensitive LIKE on title and summary)
  if (q && q.trim()) {
    const search = `%${q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${coachingPackages.title}) LIKE ${search}`,
        sql`LOWER(${coachingPackages.summary}) LIKE ${search}`
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort — prefix with '-' for descending (default), no prefix for ascending
  const sortDesc = sort.startsWith('-');
  const sortField = sort.replace(/^-/, '');
  const sortColumn =
    sortField === 'title' ? coachingPackages.title
    : sortField === 'displayOrder' ? coachingPackages.displayOrder
    : sortField === 'publishedAt' ? coachingPackages.publishedAt
    : sortField === 'createdAt' ? coachingPackages.createdAt
    : coachingPackages.updatedAt;
  const orderFn = sortDesc ? desc : asc;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(coachingPackages)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ total: count() })
      .from(coachingPackages)
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

// ─── POST /apply — Public coaching application (discovery call request) ─

coachingRoutes.post('/apply', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.name || !body.email) {
    return c.json({ error: 'Name and email are required' }, 400);
  }

  const application = await db
    .insert(coachingApplications)
    .values({
      name: body.name,
      email: body.email.toLowerCase().trim(),
      phone: body.phone || null,
      reason: body.reason || null,
      preferredPackage: body.package || null,
    })
    .returning()
    .get();

  // Trigger coaching inquiry automation
  await triggerAutomation(db, 'coaching_inquiry', body.email.toLowerCase().trim(), body.name);

  return c.json({ success: true, id: application.id }, 201);
});

// ─── GET /applications — List applications (admin only) ─

coachingRoutes.get('/applications', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');

  const conditions = [];
  if (status) conditions.push(eq(coachingApplications.status, status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(coachingApplications)
    .where(whereClause)
    .orderBy(desc(coachingApplications.createdAt))
    .all();

  return c.json(items);
});

// ─── PUT /applications/:id — Update application status (admin only) ─

coachingRoutes.put('/applications/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user');

  const existing = await db
    .select()
    .from(coachingApplications)
    .where(eq(coachingApplications.id, id))
    .get();

  if (!existing) return c.json({ error: 'Application not found' }, 404);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = await db
    .update(coachingApplications)
    .set(updateData)
    .where(eq(coachingApplications.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'coaching_application', updated, user);

  return c.json(updated);
});

// ─── GET /:idOrSlug — Get single coaching offer (public) ─

coachingRoutes.get('/:idOrSlug', optionalAdminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const idOrSlug = c.req.param('idOrSlug');

  await autoPublishScheduled(db);

  // Try by ID first, then by slug
  let item = await db.select().from(coachingPackages).where(eq(coachingPackages.id, idOrSlug)).get();

  if (!item) {
    item = await db.select().from(coachingPackages).where(eq(coachingPackages.slug, idOrSlug)).get();
  }

  // If not found by primary lookup, also check previousSlugs for old slug redirects
  if (!item) {
    const allItems = await db
      .select()
      .from(coachingPackages)
      .where(sql`${coachingPackages.previousSlugs} LIKE ${'%"' + idOrSlug + '"%'}`)
      .all();

    if (allItems.length > 0) {
      item = allItems[0];
    }
  }

  if (!item) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  // Non-admin users can only see published items
  if (item.status !== 'published' && !user) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  return c.json(item);
});

// ─── POST / — Create coaching offer (admin only) ────────

coachingRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const baseSlug = body.slug || generateSlug(body.title);
  const slug = await ensureUniqueSlug(db, baseSlug);
  const now = new Date().toISOString();

  const user = c.get('user');
  const item = await db
    .insert(coachingPackages)
    .values({
      title: body.title,
      slug,
      description: body.description || null,
      features: body.features || [],
      ctaText: body.ctaText || 'Apply Now',
      image: body.image || null,
      price: body.price || null,
      priceAmount: body.priceAmount || null,
      currency: body.currency || 'AUD',
      recurring: body.recurring || false,
      recurringInterval: body.recurringInterval || null,
      badge: body.badge || null,
      stripeProductId: body.stripeProductId || null,
      stripePriceId: body.stripePriceId || null,
      displayOrder: body.displayOrder ?? 0,
      archived: false,
      status: body.status || 'draft',
      summary: body.summary || null,
      descriptionHtml: body.descriptionHtml || null,
      descriptionJson: body.descriptionJson || null,
      coverImageUrl: body.coverImageUrl || null,
      priceType: body.priceType || 'fixed',
      durationMinutes: body.durationMinutes || null,
      deliveryMode: body.deliveryMode || 'online',
      locationLabel: body.locationLabel || null,
      bookingUrl: body.bookingUrl || null,
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
    })
    .returning()
    .get();

  await logActivity(db, 'create', 'coaching_package', item, user);

  return c.json(item, 201);
});

// ─── PUT /:id — Update coaching offer (admin only) ──────

coachingRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const now = new Date().toISOString();

  // Save a revision before updating (keep max 10)
  await db.insert(coachingRevisions).values({
    coachingId: id,
    title: existing.title,
    summary: existing.summary || null,
    descriptionHtml: existing.descriptionHtml || null,
    descriptionJson: existing.descriptionJson || null,
    features: existing.features || [],
    createdBy: user?.id || null,
    savedAt: now,
  });

  // Prune old revisions beyond 10
  const allRevisions = await db
    .select({ id: coachingRevisions.id })
    .from(coachingRevisions)
    .where(eq(coachingRevisions.coachingId, id))
    .orderBy(desc(coachingRevisions.savedAt))
    .all();

  if (allRevisions.length > 10) {
    const toDelete = allRevisions.slice(10);
    for (const rev of toDelete) {
      await db.delete(coachingRevisions).where(eq(coachingRevisions.id, rev.id));
    }
  }

  // Build update data
  const updateData: Record<string, any> = { updatedAt: now };

  // Handle slug change — save old slug to previousSlugs if item was published
  if (body.slug !== undefined && body.slug && body.slug !== existing.slug) {
    const uniqueSlug = await ensureUniqueSlug(db, body.slug, id);
    if (existing.status === 'published' || existing.publishedAt) {
      const prevSlugs: string[] = (existing.previousSlugs as string[]) || [];
      if (!prevSlugs.includes(existing.slug)) {
        updateData.previousSlugs = [...prevSlugs, existing.slug];
      }
    }
    updateData.slug = uniqueSlug;
  }

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.features !== undefined) updateData.features = body.features;
  if (body.ctaText !== undefined) updateData.ctaText = body.ctaText;
  if (body.image !== undefined) updateData.image = body.image;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.priceAmount !== undefined) updateData.priceAmount = body.priceAmount;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.recurring !== undefined) updateData.recurring = body.recurring;
  if (body.recurringInterval !== undefined) updateData.recurringInterval = body.recurringInterval;
  if (body.badge !== undefined) updateData.badge = body.badge;
  if (body.stripeProductId !== undefined) updateData.stripeProductId = body.stripeProductId;
  if (body.stripePriceId !== undefined) updateData.stripePriceId = body.stripePriceId;
  if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
  if (body.summary !== undefined) updateData.summary = body.summary;
  if (body.descriptionHtml !== undefined) updateData.descriptionHtml = body.descriptionHtml;
  if (body.descriptionJson !== undefined) updateData.descriptionJson = body.descriptionJson;
  if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;
  if (body.priceType !== undefined) updateData.priceType = body.priceType;
  if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;
  if (body.deliveryMode !== undefined) updateData.deliveryMode = body.deliveryMode;
  if (body.locationLabel !== undefined) updateData.locationLabel = body.locationLabel;
  if (body.bookingUrl !== undefined) updateData.bookingUrl = body.bookingUrl;
  if (body.seoTitle !== undefined) updateData.seoTitle = body.seoTitle;
  if (body.seoDescription !== undefined) updateData.seoDescription = body.seoDescription;
  if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl;
  if (body.tags !== undefined) updateData.tags = body.tags;

  // Handle status changes via the update body (not lifecycle endpoints)
  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === 'published') {
      updateData.archived = false;
      if (!existing.publishedAt) updateData.publishedAt = now;
    }
    if (body.status === 'archived') {
      updateData.archived = true;
    }
    if (body.status === 'scheduled' && body.scheduledAt) {
      updateData.scheduledAt = body.scheduledAt;
    }
    if (body.status === 'draft') {
      updateData.scheduledAt = null;
    }
  }

  const item = await db
    .update(coachingPackages)
    .set(updateData)
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'coaching_package', item, user);

  return c.json(item);
});

// ─── POST /:id/publish — Publish (admin only) ──────────

coachingRoutes.post('/:id/publish', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(coachingPackages)
    .set({
      status: 'published',
      publishedAt: existing.publishedAt || now,
      archived: false,
      scheduledAt: null,
      updatedAt: now,
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  await logActivity(db, 'publish', 'coaching_package', item, user);

  return c.json(item);
});

// ─── POST /:id/unpublish — Unpublish (admin only) ──────

coachingRoutes.post('/:id/unpublish', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const item = await db
    .update(coachingPackages)
    .set({
      status: 'draft',
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  await logActivity(db, 'unpublish', 'coaching_package', item, user);

  return c.json(item);
});

// ─── POST /:id/schedule — Schedule (admin only) ────────

coachingRoutes.post('/:id/schedule', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!body.scheduledAt) {
    return c.json({ error: 'scheduledAt is required' }, 400);
  }

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const scheduleDate = new Date(body.scheduledAt);
  if (scheduleDate <= new Date()) {
    return c.json({ error: 'Scheduled date must be in the future' }, 400);
  }

  const item = await db
    .update(coachingPackages)
    .set({
      status: 'scheduled',
      scheduledAt: body.scheduledAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'coaching_package', item, user);

  return c.json(item);
});

// ─── POST /:id/archive — Archive (admin only) ──────────

coachingRoutes.post('/:id/archive', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const item = await db
    .update(coachingPackages)
    .set({
      status: 'archived',
      archived: true,
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  await logActivity(db, 'archive', 'coaching_package', item, user);

  return c.json(item);
});

// ─── DELETE /:id — Delete (admin only) ──────────────────

coachingRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  // Revisions cascade-delete automatically via FK onDelete: 'cascade'
  await db.delete(coachingPackages).where(eq(coachingPackages.id, id));

  await logActivity(db, 'delete', 'coaching_package', existing, user);

  return c.json({ success: true });
});

// ─── GET /:id/revisions — List revisions (admin only) ───

coachingRoutes.get('/:id/revisions', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select({ id: coachingPackages.id })
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const revisions = await db
    .select()
    .from(coachingRevisions)
    .where(eq(coachingRevisions.coachingId, id))
    .orderBy(desc(coachingRevisions.savedAt))
    .limit(10)
    .all();

  return c.json(revisions);
});

// ─── POST /:id/revisions/:revisionId/restore — Restore revision (admin only) ─

coachingRoutes.post('/:id/revisions/:revisionId/restore', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const revisionId = c.req.param('revisionId');

  const existing = await db
    .select()
    .from(coachingPackages)
    .where(eq(coachingPackages.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Coaching offer not found' }, 404);
  }

  const revision = await db
    .select()
    .from(coachingRevisions)
    .where(eq(coachingRevisions.id, revisionId))
    .get();

  if (!revision || revision.coachingId !== id) {
    return c.json({ error: 'Revision not found' }, 404);
  }

  const item = await db
    .update(coachingPackages)
    .set({
      title: revision.title,
      summary: revision.summary,
      descriptionHtml: revision.descriptionHtml,
      descriptionJson: revision.descriptionJson,
      features: revision.features || [],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(coachingPackages.id, id))
    .returning()
    .get();

  return c.json(item);
});

