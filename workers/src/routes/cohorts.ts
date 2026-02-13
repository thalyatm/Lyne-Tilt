import { Hono } from 'hono';
import { eq, desc, asc, sql, and, or, count } from 'drizzle-orm';
import { cohorts, cohortSessions, cohortEnrollments, cohortAttendance, learnItems } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const cohortsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
      .select({ id: cohorts.id })
      .from(cohorts)
      .where(
        excludeId
          ? and(eq(cohorts.slug, candidate), sql`${cohorts.id} != ${excludeId}`)
          : eq(cohorts.slug, candidate)
      )
      .get();

    if (!existing) return candidate;

    attempt++;
    if (attempt > 20) {
      return `${slug}-${Date.now()}`;
    }
  }
}

// ─── GET / — List cohorts (admin only) ──────────────────

cohortsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');

  const {
    learnItemId,
    status,
    q,
    page,
    pageSize,
    sort = '-startAt',
    upcoming,
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));
  const offset = (pageNum - 1) * limit;

  // Build conditions
  const conditions = [];

  if (learnItemId) {
    conditions.push(eq(cohorts.learnItemId, learnItemId));
  }

  if (status && ['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    conditions.push(eq(cohorts.status, status as any));
  }

  if (q && q.trim()) {
    const search = `%${q.trim().toLowerCase()}%`;
    conditions.push(sql`LOWER(${cohorts.title}) LIKE ${search}`);
  }

  if (upcoming === 'true') {
    const now = new Date().toISOString();
    conditions.push(sql`${cohorts.startAt} > ${now}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort
  const sortDesc = sort.startsWith('-');
  const sortField = sort.replace(/^-/, '');
  const sortColumn =
    sortField === 'title' ? cohorts.title
    : sortField === 'createdAt' ? cohorts.createdAt
    : cohorts.startAt;
  const orderFn = sortDesc ? desc : asc;

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: cohorts.id,
        learnItemId: cohorts.learnItemId,
        title: cohorts.title,
        slug: cohorts.slug,
        status: cohorts.status,
        description: cohorts.description,
        startAt: cohorts.startAt,
        endAt: cohorts.endAt,
        timezone: cohorts.timezone,
        capacity: cohorts.capacity,
        enrolledCount: cohorts.enrolledCount,
        waitlistEnabled: cohorts.waitlistEnabled,
        waitlistCount: cohorts.waitlistCount,
        price: cohorts.price,
        currency: cohorts.currency,
        deliveryMode: cohorts.deliveryMode,
        locationLabel: cohorts.locationLabel,
        instructorName: cohorts.instructorName,
        registrationOpensAt: cohorts.registrationOpensAt,
        registrationClosesAt: cohorts.registrationClosesAt,
        createdAt: cohorts.createdAt,
        updatedAt: cohorts.updatedAt,
        learnItemTitle: learnItems.title,
      })
      .from(cohorts)
      .leftJoin(learnItems, eq(cohorts.learnItemId, learnItems.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ total: count() })
      .from(cohorts)
      .where(whereClause)
      .get(),
  ]);

  const total = countResult?.total ?? 0;

  return c.json({
    items,
    total,
    page: pageNum,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ─── GET /:id — Get single cohort (admin only) ─────────

cohortsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const cohort = await db
    .select({
      id: cohorts.id,
      learnItemId: cohorts.learnItemId,
      title: cohorts.title,
      slug: cohorts.slug,
      status: cohorts.status,
      description: cohorts.description,
      internalNotes: cohorts.internalNotes,
      startAt: cohorts.startAt,
      endAt: cohorts.endAt,
      timezone: cohorts.timezone,
      registrationOpensAt: cohorts.registrationOpensAt,
      registrationClosesAt: cohorts.registrationClosesAt,
      capacity: cohorts.capacity,
      enrolledCount: cohorts.enrolledCount,
      waitlistEnabled: cohorts.waitlistEnabled,
      waitlistCapacity: cohorts.waitlistCapacity,
      waitlistCount: cohorts.waitlistCount,
      price: cohorts.price,
      compareAtPrice: cohorts.compareAtPrice,
      earlyBirdPrice: cohorts.earlyBirdPrice,
      earlyBirdEndsAt: cohorts.earlyBirdEndsAt,
      currency: cohorts.currency,
      deliveryMode: cohorts.deliveryMode,
      locationLabel: cohorts.locationLabel,
      locationAddress: cohorts.locationAddress,
      meetingUrl: cohorts.meetingUrl,
      instructorName: cohorts.instructorName,
      instructorEmail: cohorts.instructorEmail,
      duplicatedFromId: cohorts.duplicatedFromId,
      publishedAt: cohorts.publishedAt,
      cancelledAt: cohorts.cancelledAt,
      cancellationReason: cohorts.cancellationReason,
      completedAt: cohorts.completedAt,
      createdAt: cohorts.createdAt,
      updatedAt: cohorts.updatedAt,
      learnItemTitle: learnItems.title,
      learnItemType: learnItems.type,
    })
    .from(cohorts)
    .leftJoin(learnItems, eq(cohorts.learnItemId, learnItems.id))
    .where(eq(cohorts.id, id))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  // Fetch sessions ordered by session_number
  const sessions = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.cohortId, id))
    .orderBy(asc(cohortSessions.sessionNumber))
    .all();

  // Fetch enrollments with attendance
  const enrollmentsList = await db
    .select()
    .from(cohortEnrollments)
    .where(eq(cohortEnrollments.cohortId, id))
    .orderBy(asc(cohortEnrollments.enrolledAt))
    .all();

  // Fetch attendance records for all enrollments in this cohort
  const enrollmentIds = enrollmentsList.map((e) => e.id);
  let attendanceRecords: any[] = [];
  if (enrollmentIds.length > 0) {
    attendanceRecords = await db
      .select()
      .from(cohortAttendance)
      .where(
        sql`${cohortAttendance.enrollmentId} IN (${sql.join(
          enrollmentIds.map((eid) => sql`${eid}`),
          sql`, `
        )})`
      )
      .all();
  }

  // Group attendance by enrollment
  const attendanceByEnrollment = new Map<string, any[]>();
  for (const record of attendanceRecords) {
    const existing = attendanceByEnrollment.get(record.enrollmentId) || [];
    existing.push(record);
    attendanceByEnrollment.set(record.enrollmentId, existing);
  }

  const enrollmentsWithAttendance = enrollmentsList.map((enrollment) => ({
    ...enrollment,
    attendance: attendanceByEnrollment.get(enrollment.id) || [],
  }));

  return c.json({
    ...cohort,
    sessions,
    enrollments: enrollmentsWithAttendance,
  });
});

// ─── POST / — Create cohort (admin only) ────────────────

cohortsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.learnItemId || !body.title) {
    return c.json({ error: 'learnItemId and title are required' }, 400);
  }

  // Verify learnItem exists
  const learnItem = await db
    .select({ id: learnItems.id })
    .from(learnItems)
    .where(eq(learnItems.id, body.learnItemId))
    .get();

  if (!learnItem) {
    return c.json({ error: 'Learn item not found' }, 404);
  }

  const baseSlug = body.slug || generateSlug(body.title);
  const slug = await ensureUniqueSlug(db, baseSlug);
  const now = new Date().toISOString();

  const item = await db
    .insert(cohorts)
    .values({
      learnItemId: body.learnItemId,
      title: body.title,
      slug,
      status: 'draft',
      description: body.description || null,
      internalNotes: body.internalNotes || null,
      startAt: body.startAt || null,
      endAt: body.endAt || null,
      timezone: body.timezone || 'Australia/Sydney',
      registrationOpensAt: body.registrationOpensAt || null,
      registrationClosesAt: body.registrationClosesAt || null,
      capacity: body.capacity ?? null,
      enrolledCount: 0,
      waitlistEnabled: body.waitlistEnabled || false,
      waitlistCapacity: body.waitlistCapacity ?? null,
      waitlistCount: 0,
      price: body.price || null,
      compareAtPrice: body.compareAtPrice || null,
      earlyBirdPrice: body.earlyBirdPrice || null,
      earlyBirdEndsAt: body.earlyBirdEndsAt || null,
      currency: body.currency || 'AUD',
      deliveryMode: body.deliveryMode || null,
      locationLabel: body.locationLabel || null,
      locationAddress: body.locationAddress || null,
      meetingUrl: body.meetingUrl || null,
      instructorName: body.instructorName || null,
      instructorEmail: body.instructorEmail || null,
      duplicatedFromId: null,
      publishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  await logActivity(db, 'create', 'cohort', item, c.get('user'));

  return c.json(item, 201);
});

// ─── PUT /:id — Update cohort (admin only) ──────────────

cohortsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  // Handle slug change
  if (body.slug !== undefined && body.slug && body.slug !== existing.slug) {
    updateData.slug = await ensureUniqueSlug(db, body.slug, id);
  }

  // If title changes and no explicit slug was provided, regenerate slug
  if (body.title !== undefined && body.title !== existing.title && body.slug === undefined) {
    const newBaseSlug = generateSlug(body.title);
    if (newBaseSlug !== existing.slug) {
      updateData.slug = await ensureUniqueSlug(db, newBaseSlug, id);
    }
  }

  if (body.title !== undefined) updateData.title = body.title;
  if (body.learnItemId !== undefined) updateData.learnItemId = body.learnItemId;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;
  if (body.startAt !== undefined) updateData.startAt = body.startAt;
  if (body.endAt !== undefined) updateData.endAt = body.endAt;
  if (body.timezone !== undefined) updateData.timezone = body.timezone;
  if (body.registrationOpensAt !== undefined) updateData.registrationOpensAt = body.registrationOpensAt;
  if (body.registrationClosesAt !== undefined) updateData.registrationClosesAt = body.registrationClosesAt;
  if (body.capacity !== undefined) updateData.capacity = body.capacity;
  if (body.waitlistEnabled !== undefined) updateData.waitlistEnabled = body.waitlistEnabled;
  if (body.waitlistCapacity !== undefined) updateData.waitlistCapacity = body.waitlistCapacity;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.compareAtPrice !== undefined) updateData.compareAtPrice = body.compareAtPrice;
  if (body.earlyBirdPrice !== undefined) updateData.earlyBirdPrice = body.earlyBirdPrice;
  if (body.earlyBirdEndsAt !== undefined) updateData.earlyBirdEndsAt = body.earlyBirdEndsAt;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.deliveryMode !== undefined) updateData.deliveryMode = body.deliveryMode;
  if (body.locationLabel !== undefined) updateData.locationLabel = body.locationLabel;
  if (body.locationAddress !== undefined) updateData.locationAddress = body.locationAddress;
  if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl;
  if (body.instructorName !== undefined) updateData.instructorName = body.instructorName;
  if (body.instructorEmail !== undefined) updateData.instructorEmail = body.instructorEmail;

  const item = await db
    .update(cohorts)
    .set(updateData)
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/open — Open registration (admin only) ───

cohortsRoutes.post('/:id/open', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  if (existing.status !== 'draft') {
    return c.json({ error: 'Cohort must be in draft status to open registration' }, 400);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(cohorts)
    .set({
      status: 'open',
      registrationOpensAt: existing.registrationOpensAt || now,
      updatedAt: now,
    })
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/close — Close registration (admin only) ─

cohortsRoutes.post('/:id/close', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(cohorts)
    .set({
      status: 'closed',
      registrationClosesAt: now,
      updatedAt: now,
    })
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/start — Mark as in progress (admin only) ─

cohortsRoutes.post('/:id/start', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(cohorts)
    .set({
      status: 'in_progress',
      updatedAt: now,
    })
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/complete — Mark as completed (admin only) ─

cohortsRoutes.post('/:id/complete', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(cohorts)
    .set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/cancel — Cancel cohort (admin only) ─────

cohortsRoutes.post('/:id/cancel', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const now = new Date().toISOString();
  const item = await db
    .update(cohorts)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancellationReason: body.reason || null,
      updatedAt: now,
    })
    .where(eq(cohorts.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'cohort', item, c.get('user'));

  return c.json(item);
});

// ─── POST /:id/duplicate — Duplicate cohort (admin only) ─

cohortsRoutes.post('/:id/duplicate', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const baseSlug = generateSlug(existing.title);
  const slug = await ensureUniqueSlug(db, baseSlug);
  const now = new Date().toISOString();

  // Create duplicated cohort
  const newCohort = await db
    .insert(cohorts)
    .values({
      learnItemId: existing.learnItemId,
      title: existing.title,
      slug,
      status: 'draft',
      description: existing.description,
      internalNotes: existing.internalNotes,
      startAt: null,
      endAt: null,
      timezone: existing.timezone,
      registrationOpensAt: null,
      registrationClosesAt: null,
      capacity: existing.capacity,
      enrolledCount: 0,
      waitlistEnabled: existing.waitlistEnabled,
      waitlistCapacity: existing.waitlistCapacity,
      waitlistCount: 0,
      price: existing.price,
      compareAtPrice: existing.compareAtPrice,
      earlyBirdPrice: existing.earlyBirdPrice,
      earlyBirdEndsAt: null,
      currency: existing.currency,
      deliveryMode: existing.deliveryMode,
      locationLabel: existing.locationLabel,
      locationAddress: existing.locationAddress,
      meetingUrl: existing.meetingUrl,
      instructorName: existing.instructorName,
      instructorEmail: existing.instructorEmail,
      duplicatedFromId: id,
      publishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // Duplicate sessions (with new IDs, cleared dates)
  const existingSessions = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.cohortId, id))
    .orderBy(asc(cohortSessions.sessionNumber))
    .all();

  for (const session of existingSessions) {
    await db.insert(cohortSessions).values({
      cohortId: newCohort.id,
      title: session.title,
      description: session.description,
      sessionNumber: session.sessionNumber,
      startAt: session.startAt,
      endAt: session.endAt,
      durationMinutes: session.durationMinutes,
      locationLabel: session.locationLabel,
      meetingUrl: session.meetingUrl,
      status: 'scheduled',
      notes: session.notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  await logActivity(db, 'duplicate', 'cohort', newCohort, c.get('user'));

  return c.json(newCohort, 201);
});

// ─── DELETE /:id — Delete cohort (admin only) ───────────

cohortsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  if (existing.status !== 'draft' && existing.status !== 'cancelled') {
    return c.json({ error: 'Only draft or cancelled cohorts can be deleted' }, 400);
  }

  // Cascading delete handled by DB FK constraints
  await db.delete(cohorts).where(eq(cohorts.id, id));

  await logActivity(db, 'delete', 'cohort', existing, c.get('user'));

  return c.json({ success: true });
});

// ─── SESSION SUB-ROUTES ─────────────────────────────────

// POST /:id/sessions — Add session
cohortsRoutes.post('/:id/sessions', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const body = await c.req.json();

  // Verify cohort exists
  const cohort = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  if (!body.title || body.sessionNumber === undefined || !body.startAt) {
    return c.json({ error: 'title, sessionNumber, and startAt are required' }, 400);
  }

  const now = new Date().toISOString();
  const session = await db
    .insert(cohortSessions)
    .values({
      cohortId,
      title: body.title,
      description: body.description || null,
      sessionNumber: body.sessionNumber,
      startAt: body.startAt,
      endAt: body.endAt || null,
      durationMinutes: body.durationMinutes ?? null,
      locationLabel: body.locationLabel || null,
      meetingUrl: body.meetingUrl || null,
      status: 'scheduled',
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return c.json(session, 201);
});

// PUT /:id/sessions/:sessionId — Update session
cohortsRoutes.put('/:id/sessions/:sessionId', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.id, sessionId))
    .get();

  if (!existing || existing.cohortId !== cohortId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.sessionNumber !== undefined) updateData.sessionNumber = body.sessionNumber;
  if (body.startAt !== undefined) updateData.startAt = body.startAt;
  if (body.endAt !== undefined) updateData.endAt = body.endAt;
  if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;
  if (body.locationLabel !== undefined) updateData.locationLabel = body.locationLabel;
  if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const session = await db
    .update(cohortSessions)
    .set(updateData)
    .where(eq(cohortSessions.id, sessionId))
    .returning()
    .get();

  return c.json(session);
});

// DELETE /:id/sessions/:sessionId — Delete session
cohortsRoutes.delete('/:id/sessions/:sessionId', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const sessionId = c.req.param('sessionId');

  const existing = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.id, sessionId))
    .get();

  if (!existing || existing.cohortId !== cohortId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  await db.delete(cohortSessions).where(eq(cohortSessions.id, sessionId));

  return c.json({ success: true });
});

// POST /:id/sessions/bulk — Bulk create sessions
cohortsRoutes.post('/:id/sessions/bulk', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const body = await c.req.json();

  // Verify cohort exists
  const cohort = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  if (!body.sessions || !Array.isArray(body.sessions) || body.sessions.length === 0) {
    return c.json({ error: 'sessions array is required and must not be empty' }, 400);
  }

  // Get current max session number for this cohort
  const maxSessionResult = await db
    .select({ maxNum: sql<number>`COALESCE(MAX(${cohortSessions.sessionNumber}), 0)` })
    .from(cohortSessions)
    .where(eq(cohortSessions.cohortId, cohortId))
    .get();

  let nextNumber = (maxSessionResult?.maxNum ?? 0) + 1;
  const now = new Date().toISOString();
  const createdSessions = [];

  for (const sessionData of body.sessions) {
    if (!sessionData.title || !sessionData.startAt) {
      return c.json({ error: 'Each session requires title and startAt' }, 400);
    }

    const session = await db
      .insert(cohortSessions)
      .values({
        cohortId,
        title: sessionData.title,
        description: sessionData.description || null,
        sessionNumber: nextNumber,
        startAt: sessionData.startAt,
        endAt: sessionData.endAt || null,
        durationMinutes: sessionData.durationMinutes ?? null,
        locationLabel: sessionData.locationLabel || null,
        meetingUrl: sessionData.meetingUrl || null,
        status: 'scheduled',
        notes: sessionData.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    createdSessions.push(session);
    nextNumber++;
  }

  return c.json(createdSessions, 201);
});

// ─── ENROLLMENT SUB-ROUTES ──────────────────────────────

// GET /:id/enrollments — List enrollments for cohort
cohortsRoutes.get('/:id/enrollments', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');

  // Verify cohort exists
  const cohort = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  const enrollmentsList = await db
    .select()
    .from(cohortEnrollments)
    .where(eq(cohortEnrollments.cohortId, cohortId))
    .orderBy(asc(cohortEnrollments.enrolledAt))
    .all();

  // Fetch attendance for all enrollments
  const enrollmentIds = enrollmentsList.map((e) => e.id);
  let attendanceRecords: any[] = [];
  if (enrollmentIds.length > 0) {
    attendanceRecords = await db
      .select()
      .from(cohortAttendance)
      .where(
        sql`${cohortAttendance.enrollmentId} IN (${sql.join(
          enrollmentIds.map((eid) => sql`${eid}`),
          sql`, `
        )})`
      )
      .all();
  }

  const attendanceByEnrollment = new Map<string, any[]>();
  for (const record of attendanceRecords) {
    const existing = attendanceByEnrollment.get(record.enrollmentId) || [];
    existing.push(record);
    attendanceByEnrollment.set(record.enrollmentId, existing);
  }

  const enrollmentsWithAttendance = enrollmentsList.map((enrollment) => ({
    ...enrollment,
    attendance: attendanceByEnrollment.get(enrollment.id) || [],
  }));

  return c.json(enrollmentsWithAttendance);
});

// POST /:id/enrollments — Add enrollment
cohortsRoutes.post('/:id/enrollments', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const body = await c.req.json();

  if (!body.customerName || !body.customerEmail) {
    return c.json({ error: 'customerName and customerEmail are required' }, 400);
  }

  // Verify cohort exists
  const cohort = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  // Prevent duplicate enrollment (same cohort + email)
  const duplicate = await db
    .select({ id: cohortEnrollments.id })
    .from(cohortEnrollments)
    .where(
      and(
        eq(cohortEnrollments.cohortId, cohortId),
        sql`LOWER(${cohortEnrollments.customerEmail}) = LOWER(${body.customerEmail})`
      )
    )
    .get();

  if (duplicate) {
    return c.json({ error: 'This email is already enrolled in this cohort' }, 409);
  }

  const now = new Date().toISOString();

  // Check capacity — if full and waitlist enabled, add to waitlist
  let enrollmentStatus: 'active' | 'waitlisted' = 'active';
  if (cohort.capacity && cohort.enrolledCount >= cohort.capacity) {
    if (cohort.waitlistEnabled) {
      // Check waitlist capacity
      if (cohort.waitlistCapacity && cohort.waitlistCount >= cohort.waitlistCapacity) {
        return c.json({ error: 'Cohort is full and waitlist is at capacity' }, 400);
      }
      enrollmentStatus = 'waitlisted';
    } else {
      return c.json({ error: 'Cohort is at capacity' }, 400);
    }
  }

  const enrollment = await db
    .insert(cohortEnrollments)
    .values({
      cohortId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerId: body.customerId || null,
      orderId: body.orderId || null,
      status: enrollmentStatus,
      pricePaid: body.pricePaid || null,
      currency: cohort.currency || 'AUD',
      paymentMethod: body.paymentMethod || null,
      waitlistPosition: enrollmentStatus === 'waitlisted' ? cohort.waitlistCount + 1 : null,
      waitlistAddedAt: enrollmentStatus === 'waitlisted' ? now : null,
      promotedFromWaitlistAt: null,
      cancelledAt: null,
      cancellationReason: null,
      refundedAt: null,
      refundAmount: null,
      enrolledBy: 'admin',
      internalNotes: body.internalNotes || null,
      enrolledAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // Update cohort counts
  if (enrollmentStatus === 'active') {
    await db
      .update(cohorts)
      .set({
        enrolledCount: cohort.enrolledCount + 1,
        updatedAt: now,
      })
      .where(eq(cohorts.id, cohortId));
  } else {
    await db
      .update(cohorts)
      .set({
        waitlistCount: cohort.waitlistCount + 1,
        updatedAt: now,
      })
      .where(eq(cohorts.id, cohortId));
  }

  return c.json(enrollment, 201);
});

// PUT /:id/enrollments/:enrollmentId — Update enrollment
cohortsRoutes.put('/:id/enrollments/:enrollmentId', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const enrollmentId = c.req.param('enrollmentId');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(cohortEnrollments)
    .where(eq(cohortEnrollments.id, enrollmentId))
    .get();

  if (!existing || existing.cohortId !== cohortId) {
    return c.json({ error: 'Enrollment not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.customerName !== undefined) updateData.customerName = body.customerName;
  if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
  if (body.customerId !== undefined) updateData.customerId = body.customerId;
  if (body.orderId !== undefined) updateData.orderId = body.orderId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.pricePaid !== undefined) updateData.pricePaid = body.pricePaid;
  if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
  if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;

  const enrollment = await db
    .update(cohortEnrollments)
    .set(updateData)
    .where(eq(cohortEnrollments.id, enrollmentId))
    .returning()
    .get();

  return c.json(enrollment);
});

// POST /:id/enrollments/:enrollmentId/cancel — Cancel enrollment
cohortsRoutes.post('/:id/enrollments/:enrollmentId/cancel', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const enrollmentId = c.req.param('enrollmentId');
  const body = await c.req.json().catch(() => ({}));

  const existing = await db
    .select()
    .from(cohortEnrollments)
    .where(eq(cohortEnrollments.id, enrollmentId))
    .get();

  if (!existing || existing.cohortId !== cohortId) {
    return c.json({ error: 'Enrollment not found' }, 404);
  }

  if (existing.status === 'cancelled') {
    return c.json({ error: 'Enrollment is already cancelled' }, 400);
  }

  const now = new Date().toISOString();
  const wasActive = existing.status === 'active';
  const wasWaitlisted = existing.status === 'waitlisted';

  const updateData: Record<string, any> = {
    status: 'cancelled',
    cancelledAt: now,
    cancellationReason: body.reason || null,
    updatedAt: now,
  };

  if (body.refundAmount) {
    updateData.refundAmount = body.refundAmount;
    updateData.refundedAt = now;
  }

  await db
    .update(cohortEnrollments)
    .set(updateData)
    .where(eq(cohortEnrollments.id, enrollmentId));

  // Fetch current cohort for count updates
  const cohort = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  // Decrement appropriate count
  if (wasActive) {
    await db
      .update(cohorts)
      .set({
        enrolledCount: Math.max(0, cohort.enrolledCount - 1),
        updatedAt: now,
      })
      .where(eq(cohorts.id, cohortId));

    // If was active and waitlist has people, promote next person
    if (cohort.waitlistEnabled && cohort.waitlistCount > 0) {
      const nextWaitlisted = await db
        .select()
        .from(cohortEnrollments)
        .where(
          and(
            eq(cohortEnrollments.cohortId, cohortId),
            eq(cohortEnrollments.status, 'waitlisted')
          )
        )
        .orderBy(asc(cohortEnrollments.waitlistPosition))
        .limit(1)
        .get();

      if (nextWaitlisted) {
        await db
          .update(cohortEnrollments)
          .set({
            status: 'active',
            promotedFromWaitlistAt: now,
            waitlistPosition: null,
            updatedAt: now,
          })
          .where(eq(cohortEnrollments.id, nextWaitlisted.id));

        // Update counts: enrolled +1, waitlist -1 (but enrolled was already decremented above)
        await db
          .update(cohorts)
          .set({
            enrolledCount: cohort.enrolledCount, // net: was decremented by 1, now add 1 back
            waitlistCount: Math.max(0, cohort.waitlistCount - 1),
            updatedAt: now,
          })
          .where(eq(cohorts.id, cohortId));
      }
    }
  } else if (wasWaitlisted) {
    await db
      .update(cohorts)
      .set({
        waitlistCount: Math.max(0, cohort.waitlistCount - 1),
        updatedAt: now,
      })
      .where(eq(cohorts.id, cohortId));
  }

  // Return the updated enrollment
  const updated = await db
    .select()
    .from(cohortEnrollments)
    .where(eq(cohortEnrollments.id, enrollmentId))
    .get();

  return c.json(updated);
});

// ─── ATTENDANCE SUB-ROUTES ──────────────────────────────

// GET /:id/sessions/:sessionId/attendance — Get attendance for session
cohortsRoutes.get('/:id/sessions/:sessionId/attendance', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const sessionId = c.req.param('sessionId');

  // Verify session belongs to cohort
  const session = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.id, sessionId))
    .get();

  if (!session || session.cohortId !== cohortId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get all active enrollments for this cohort
  const enrollmentsList = await db
    .select()
    .from(cohortEnrollments)
    .where(
      and(
        eq(cohortEnrollments.cohortId, cohortId),
        eq(cohortEnrollments.status, 'active')
      )
    )
    .orderBy(asc(cohortEnrollments.customerName))
    .all();

  // Get attendance records for this session
  const attendanceRecords = await db
    .select()
    .from(cohortAttendance)
    .where(eq(cohortAttendance.sessionId, sessionId))
    .all();

  const attendanceMap = new Map<string, any>();
  for (const record of attendanceRecords) {
    attendanceMap.set(record.enrollmentId, record);
  }

  // Combine enrollments with their attendance status
  const result = enrollmentsList.map((enrollment) => ({
    ...enrollment,
    attendance: attendanceMap.get(enrollment.id) || null,
  }));

  return c.json(result);
});

// POST /:id/sessions/:sessionId/attendance — Bulk set attendance
cohortsRoutes.post('/:id/sessions/:sessionId/attendance', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();

  // Verify session belongs to cohort
  const session = await db
    .select()
    .from(cohortSessions)
    .where(eq(cohortSessions.id, sessionId))
    .get();

  if (!session || session.cohortId !== cohortId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
    return c.json({ error: 'records array is required and must not be empty' }, 400);
  }

  const now = new Date().toISOString();
  const results = [];

  for (const record of body.records) {
    if (!record.enrollmentId || !record.status) {
      return c.json({ error: 'Each record requires enrollmentId and status' }, 400);
    }

    if (!['present', 'absent', 'late', 'excused'].includes(record.status)) {
      return c.json({ error: `Invalid status: ${record.status}. Must be present, absent, late, or excused` }, 400);
    }

    // Check if attendance record already exists (upsert)
    const existing = await db
      .select()
      .from(cohortAttendance)
      .where(
        and(
          eq(cohortAttendance.sessionId, sessionId),
          eq(cohortAttendance.enrollmentId, record.enrollmentId)
        )
      )
      .get();

    if (existing) {
      // Update existing
      const updated = await db
        .update(cohortAttendance)
        .set({
          status: record.status,
          checkedInAt: record.status === 'present' || record.status === 'late' ? now : existing.checkedInAt,
          notes: record.notes !== undefined ? record.notes : existing.notes,
        })
        .where(eq(cohortAttendance.id, existing.id))
        .returning()
        .get();

      results.push(updated);
    } else {
      // Insert new
      const created = await db
        .insert(cohortAttendance)
        .values({
          sessionId,
          enrollmentId: record.enrollmentId,
          status: record.status,
          checkedInAt: record.status === 'present' || record.status === 'late' ? now : null,
          notes: record.notes || null,
          createdAt: now,
        })
        .returning()
        .get();

      results.push(created);
    }
  }

  return c.json(results);
});

// ─── STATS ──────────────────────────────────────────────

// GET /:id/stats — Get cohort statistics
cohortsRoutes.get('/:id/stats', adminAuth, async (c) => {
  const db = c.get('db');
  const cohortId = c.req.param('id');

  const cohort = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .get();

  if (!cohort) {
    return c.json({ error: 'Cohort not found' }, 404);
  }

  // Sessions stats
  const sessionsTotal = await db
    .select({ total: count() })
    .from(cohortSessions)
    .where(eq(cohortSessions.cohortId, cohortId))
    .get();

  const sessionsCompleted = await db
    .select({ total: count() })
    .from(cohortSessions)
    .where(
      and(
        eq(cohortSessions.cohortId, cohortId),
        eq(cohortSessions.status, 'completed')
      )
    )
    .get();

  // Attendance rate (avg across sessions: count present+late / total attendance records)
  const totalAttendanceRecords = await db
    .select({ total: count() })
    .from(cohortAttendance)
    .innerJoin(cohortSessions, eq(cohortAttendance.sessionId, cohortSessions.id))
    .where(eq(cohortSessions.cohortId, cohortId))
    .get();

  const presentRecords = await db
    .select({ total: count() })
    .from(cohortAttendance)
    .innerJoin(cohortSessions, eq(cohortAttendance.sessionId, cohortSessions.id))
    .where(
      and(
        eq(cohortSessions.cohortId, cohortId),
        or(
          eq(cohortAttendance.status, 'present'),
          eq(cohortAttendance.status, 'late')
        )
      )
    )
    .get();

  const totalAtt = totalAttendanceRecords?.total ?? 0;
  const presentAtt = presentRecords?.total ?? 0;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) / 100 : null;

  // Revenue (sum of pricePaid for active/completed enrollments)
  const revenueResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${cohortEnrollments.pricePaid} AS REAL)), 0)`,
    })
    .from(cohortEnrollments)
    .where(
      and(
        eq(cohortEnrollments.cohortId, cohortId),
        or(
          eq(cohortEnrollments.status, 'active'),
          eq(cohortEnrollments.status, 'completed')
        )
      )
    )
    .get();

  return c.json({
    enrolledCount: cohort.enrolledCount,
    waitlistCount: cohort.waitlistCount,
    capacity: cohort.capacity,
    attendanceRate,
    sessionsCompleted: sessionsCompleted?.total ?? 0,
    sessionsTotal: sessionsTotal?.total ?? 0,
    revenue: revenueResult?.total ?? '0',
  });
});
