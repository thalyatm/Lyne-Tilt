import { Hono } from 'hono';
import { eq, and, sql, desc, asc, or } from 'drizzle-orm';
import { coachingClients, clientNotes, coachingBookings, coachingPackages } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const clientsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require admin auth
// ═══════════════════════════════════════════
// CLIENTS CRUD
// ═══════════════════════════════════════════

// ─── GET / — List clients with filters, search, pagination + stats ───
clientsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');

  const status = c.req.query('status') || '';
  const q = (c.req.query('q') || '').trim();
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
  const offset = (page - 1) * pageSize;
  const today = new Date().toISOString().split('T')[0];

  // Build filter conditions
  const conditions: any[] = [];

  if (status && status !== 'all') {
    conditions.push(eq(coachingClients.status, status as any));
  }

  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${coachingClients.name}) LIKE ${pattern} OR LOWER(${coachingClients.email}) LIKE ${pattern})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch clients with computed fields via subqueries
  const clients = await db
    .select({
      id: coachingClients.id,
      name: coachingClients.name,
      email: coachingClients.email,
      phone: coachingClients.phone,
      status: coachingClients.status,
      source: coachingClients.source,
      currentPackageId: coachingClients.currentPackageId,
      packageName: sql<string | null>`(
        SELECT ${coachingPackages.title}
        FROM ${coachingPackages}
        WHERE ${coachingPackages.id} = ${coachingClients.currentPackageId}
      )`.as('package_name'),
      goals: coachingClients.goals,
      startDate: coachingClients.startDate,
      sessionCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${coachingBookings}
        WHERE ${coachingBookings.clientId} = ${coachingClients.id}
      )`.as('session_count'),
      nextSessionDate: sql<string | null>`(
        SELECT MIN(${coachingBookings.sessionDate})
        FROM ${coachingBookings}
        WHERE ${coachingBookings.clientId} = ${coachingClients.id}
          AND ${coachingBookings.sessionDate} >= ${today}
          AND ${coachingBookings.status} IN ('pending', 'confirmed')
      )`.as('next_session_date'),
      lastSessionDate: sql<string | null>`(
        SELECT MAX(${coachingBookings.sessionDate})
        FROM ${coachingBookings}
        WHERE ${coachingBookings.clientId} = ${coachingClients.id}
          AND ${coachingBookings.status} = 'completed'
      )`.as('last_session_date'),
      createdAt: coachingClients.createdAt,
      updatedAt: coachingClients.updatedAt,
    })
    .from(coachingClients)
    .where(whereClause)
    .orderBy(desc(coachingClients.updatedAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  // Total count for pagination (with same filters)
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(coachingClients)
    .where(whereClause)
    .get();

  const total = totalResult?.count ?? 0;

  // Stats: count by status (unfiltered)
  const statsRows = await db
    .select({
      status: coachingClients.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(coachingClients)
    .groupBy(coachingClients.status)
    .all();

  const stats: Record<string, number> = {
    total: 0,
    prospect: 0,
    discovery: 0,
    active: 0,
    paused: 0,
    completed: 0,
  };

  for (const row of statsRows) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }

  return c.json({ clients, total, stats });
});

// ─── POST / — Create client ─────────────────────────────────────────
clientsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { name, email, phone, status, source, goals, notes, communicationPreference, currentPackageId, startDate } = body;

  if (!name || !email) {
    return c.json({ error: 'name and email are required' }, 400);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(coachingClients)
    .values({
      id,
      name,
      email,
      phone: phone || null,
      status: status || 'prospect',
      source: source || 'other',
      goals: goals || null,
      notes: notes || null,
      communicationPreference: communicationPreference || null,
      currentPackageId: currentPackageId || null,
      startDate: startDate || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = await db
    .select()
    .from(coachingClients)
    .where(eq(coachingClients.id, id))
    .get();

  return c.json(created, 201);
});

// ─── GET /:id — Client detail with sessions and computed stats ──────
clientsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  // Fetch client with package name
  const client = await db
    .select({
      id: coachingClients.id,
      name: coachingClients.name,
      email: coachingClients.email,
      phone: coachingClients.phone,
      status: coachingClients.status,
      source: coachingClients.source,
      currentPackageId: coachingClients.currentPackageId,
      packageName: sql<string | null>`(
        SELECT ${coachingPackages.title}
        FROM ${coachingPackages}
        WHERE ${coachingPackages.id} = ${coachingClients.currentPackageId}
      )`.as('package_name'),
      goals: coachingClients.goals,
      notes: coachingClients.notes,
      communicationPreference: coachingClients.communicationPreference,
      importantDates: coachingClients.importantDates,
      startDate: coachingClients.startDate,
      createdAt: coachingClients.createdAt,
      updatedAt: coachingClients.updatedAt,
    })
    .from(coachingClients)
    .where(eq(coachingClients.id, id))
    .get();

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  // Fetch all bookings for this client
  const bookings = await db
    .select({
      id: coachingBookings.id,
      sessionDate: coachingBookings.sessionDate,
      startTime: coachingBookings.startTime,
      endTime: coachingBookings.endTime,
      packageName: coachingBookings.packageName,
      status: coachingBookings.status,
      notes: coachingBookings.notes,
      meetingUrl: coachingBookings.meetingUrl,
    })
    .from(coachingBookings)
    .where(eq(coachingBookings.clientId, id))
    .orderBy(desc(coachingBookings.sessionDate))
    .all();

  // Compute stats from bookings
  const today = new Date().toISOString().split('T')[0];
  const totalSessions = bookings.length;
  const completedSessions = bookings.filter((b) => b.status === 'completed').length;
  const upcomingSessions = bookings.filter(
    (b) => b.sessionDate >= today && (b.status === 'pending' || b.status === 'confirmed')
  ).length;
  const cancelledSessions = bookings.filter((b) => b.status === 'cancelled').length;

  return c.json({
    client,
    sessions: bookings,
    stats: {
      totalSessions,
      completedSessions,
      upcomingSessions,
      cancelledSessions,
      clientSince: client.createdAt,
    },
  });
});

// ─── PUT /:id — Update client ───────────────────────────────────────
clientsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(coachingClients)
    .where(eq(coachingClients.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.source !== undefined) updateData.source = body.source;
  if (body.currentPackageId !== undefined) updateData.currentPackageId = body.currentPackageId;
  if (body.goals !== undefined) updateData.goals = body.goals;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.communicationPreference !== undefined) updateData.communicationPreference = body.communicationPreference;
  if (body.importantDates !== undefined) updateData.importantDates = body.importantDates;
  if (body.startDate !== undefined) updateData.startDate = body.startDate;

  await db
    .update(coachingClients)
    .set(updateData)
    .where(eq(coachingClients.id, id))
    .run();

  const updated = await db
    .select()
    .from(coachingClients)
    .where(eq(coachingClients.id, id))
    .get();

  return c.json(updated);
});

// ─── DELETE /:id — Delete client (hard delete) ──────────────────────
clientsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingClients)
    .where(eq(coachingClients.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Client not found' }, 404);
  }

  // Delete client notes first (FK cascade should handle this, but be explicit)
  await db
    .delete(clientNotes)
    .where(eq(clientNotes.clientId, id))
    .run();

  await db
    .delete(coachingClients)
    .where(eq(coachingClients.id, id))
    .run();

  return c.body(null, 204);
});

// ═══════════════════════════════════════════
// CLIENT NOTES
// ═══════════════════════════════════════════

// ─── GET /:id/notes — List notes for a client ───────────────────────
clientsRoutes.get('/:id/notes', adminAuth, async (c) => {
  const db = c.get('db');
  const clientId = c.req.param('id');

  // Verify client exists
  const client = await db
    .select({ id: coachingClients.id })
    .from(coachingClients)
    .where(eq(coachingClients.id, clientId))
    .get();

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const notes = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.clientId, clientId))
    .orderBy(desc(clientNotes.createdAt))
    .all();

  return c.json(notes);
});

// ─── POST /:id/notes — Add note to client ───────────────────────────
clientsRoutes.post('/:id/notes', adminAuth, async (c) => {
  const db = c.get('db');
  const clientId = c.req.param('id');
  const body = await c.req.json();
  const { content, type, sessionDate } = body;

  if (!content) {
    return c.json({ error: 'content is required' }, 400);
  }

  // Verify client exists
  const client = await db
    .select({ id: coachingClients.id })
    .from(coachingClients)
    .where(eq(coachingClients.id, clientId))
    .get();

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(clientNotes)
    .values({
      id,
      clientId,
      content,
      type: type || 'general',
      sessionDate: sessionDate || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.id, id))
    .get();

  return c.json(created, 201);
});

// ─── PUT /:id/notes/:noteId — Update a note ─────────────────────────
clientsRoutes.put('/:id/notes/:noteId', adminAuth, async (c) => {
  const db = c.get('db');
  const clientId = c.req.param('id');
  const noteId = c.req.param('noteId');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(clientNotes)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.clientId, clientId)))
    .get();

  if (!existing) {
    return c.json({ error: 'Note not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.content !== undefined) updateData.content = body.content;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.sessionDate !== undefined) updateData.sessionDate = body.sessionDate;

  await db
    .update(clientNotes)
    .set(updateData)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.clientId, clientId)))
    .run();

  const updated = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.id, noteId))
    .get();

  return c.json(updated);
});

// ─── DELETE /:id/notes/:noteId — Delete a note ──────────────────────
clientsRoutes.delete('/:id/notes/:noteId', adminAuth, async (c) => {
  const db = c.get('db');
  const clientId = c.req.param('id');
  const noteId = c.req.param('noteId');

  const existing = await db
    .select()
    .from(clientNotes)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.clientId, clientId)))
    .get();

  if (!existing) {
    return c.json({ error: 'Note not found' }, 404);
  }

  await db
    .delete(clientNotes)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.clientId, clientId)))
    .run();

  return c.body(null, 204);
});
