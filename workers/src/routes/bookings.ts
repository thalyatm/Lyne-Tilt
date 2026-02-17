import { Hono } from 'hono';
import { eq, and, sql, desc, asc, gte, lte } from 'drizzle-orm';
import { coachAvailability, coachBlockedDates, coachingBookings, coachingPackages } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const bookingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ═══════════════════════════════════════════
// AVAILABILITY (admin only)
// ═══════════════════════════════════════════

// ─── GET /availability — Get all availability windows ─────
bookingsRoutes.get('/availability', adminAuth, async (c) => {
  const db = c.get('db');

  const windows = await db
    .select()
    .from(coachAvailability)
    .orderBy(asc(coachAvailability.dayOfWeek), asc(coachAvailability.startTime))
    .all();

  return c.json(windows);
});

// ─── POST /availability — Create availability window ──────
bookingsRoutes.post('/availability', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { dayOfWeek, startTime, endTime, slotDuration, timezone } = body;

  if (dayOfWeek === undefined || !startTime || !endTime) {
    return c.json({ error: 'dayOfWeek, startTime, and endTime are required' }, 400);
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return c.json({ error: 'dayOfWeek must be 0-6 (Sunday-Saturday)' }, 400);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(coachAvailability)
    .values({
      id,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration: slotDuration || 60,
      timezone: timezone || 'Australia/Melbourne',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = await db
    .select()
    .from(coachAvailability)
    .where(eq(coachAvailability.id, id))
    .get();

  return c.json(created, 201);
});

// ─── PUT /availability/:id — Update availability window ───
bookingsRoutes.put('/availability/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(coachAvailability)
    .where(eq(coachAvailability.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Availability window not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;
  if (body.slotDuration !== undefined) updateData.slotDuration = body.slotDuration;
  if (body.timezone !== undefined) updateData.timezone = body.timezone;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  await db
    .update(coachAvailability)
    .set(updateData)
    .where(eq(coachAvailability.id, id))
    .run();

  const updated = await db
    .select()
    .from(coachAvailability)
    .where(eq(coachAvailability.id, id))
    .get();

  return c.json(updated);
});

// ─── DELETE /availability/:id — Delete availability window ─
bookingsRoutes.delete('/availability/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachAvailability)
    .where(eq(coachAvailability.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Availability window not found' }, 404);
  }

  await db
    .delete(coachAvailability)
    .where(eq(coachAvailability.id, id))
    .run();

  return c.json({ success: true });
});

// ─── GET /blocked-dates — Get all blocked dates (future only) ─
bookingsRoutes.get('/blocked-dates', adminAuth, async (c) => {
  const db = c.get('db');
  const today = new Date().toISOString().slice(0, 10);

  const blocked = await db
    .select()
    .from(coachBlockedDates)
    .where(gte(coachBlockedDates.blockedDate, today))
    .orderBy(asc(coachBlockedDates.blockedDate))
    .all();

  return c.json(blocked);
});

// ─── POST /blocked-dates — Block a date ───────────────────
bookingsRoutes.post('/blocked-dates', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { blockedDate, reason } = body;

  if (!blockedDate) {
    return c.json({ error: 'blockedDate is required' }, 400);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(coachBlockedDates)
    .values({
      id,
      blockedDate,
      reason: reason || null,
      createdAt: now,
    })
    .run();

  const created = await db
    .select()
    .from(coachBlockedDates)
    .where(eq(coachBlockedDates.id, id))
    .get();

  return c.json(created, 201);
});

// ─── DELETE /blocked-dates/:id — Unblock a date ───────────
bookingsRoutes.delete('/blocked-dates/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachBlockedDates)
    .where(eq(coachBlockedDates.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Blocked date not found' }, 404);
  }

  await db
    .delete(coachBlockedDates)
    .where(eq(coachBlockedDates.id, id))
    .run();

  return c.json({ success: true });
});

// ═══════════════════════════════════════════
// BOOKINGS
// ═══════════════════════════════════════════

// ─── GET /slots/:date — Get available time slots (PUBLIC) ─
bookingsRoutes.get('/slots/:date', async (c) => {
  const db = c.get('db');
  const date = c.req.param('date');

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
  }

  // Check if the date is blocked
  const blocked = await db
    .select()
    .from(coachBlockedDates)
    .where(eq(coachBlockedDates.blockedDate, date))
    .get();

  if (blocked) {
    return c.json({ date, dayOfWeek: new Date(date + 'T00:00:00').getDay(), timezone: 'Australia/Melbourne', slots: [] });
  }

  // Determine day of week (0=Sunday .. 6=Saturday)
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  // Find active availability windows for this day
  const windows = await db
    .select()
    .from(coachAvailability)
    .where(
      and(
        eq(coachAvailability.dayOfWeek, dayOfWeek),
        eq(coachAvailability.isActive, true)
      )
    )
    .orderBy(asc(coachAvailability.startTime))
    .all();

  if (windows.length === 0) {
    return c.json({ date, dayOfWeek, timezone: 'Australia/Melbourne', slots: [] });
  }

  // Get the timezone from the first window (they should all share the same timezone)
  const timezone = windows[0].timezone;

  // Get existing non-cancelled bookings for this date
  const existingBookings = await db
    .select({
      startTime: coachingBookings.startTime,
      endTime: coachingBookings.endTime,
    })
    .from(coachingBookings)
    .where(
      and(
        eq(coachingBookings.sessionDate, date),
        sql`${coachingBookings.status} NOT IN ('cancelled')`
      )
    )
    .all();

  // Generate time slots from availability windows
  const slots: { startTime: string; endTime: string; available: boolean }[] = [];

  for (const window of windows) {
    const slotDuration = window.slotDuration;
    const [startHour, startMin] = window.startTime.split(':').map(Number);
    const [endHour, endMin] = window.endTime.split(':').map(Number);
    const windowStartMinutes = startHour * 60 + startMin;
    const windowEndMinutes = endHour * 60 + endMin;

    for (let slotStart = windowStartMinutes; slotStart + slotDuration <= windowEndMinutes; slotStart += slotDuration) {
      const slotEnd = slotStart + slotDuration;
      const slotStartTime = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
      const slotEndTime = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some((booking) => {
        // Two time ranges overlap if one starts before the other ends and vice versa
        return slotStartTime < booking.endTime && slotEndTime > booking.startTime;
      });

      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        available: !hasConflict,
      });
    }
  }

  return c.json({ date, dayOfWeek, timezone, slots });
});

// Apply admin auth to all remaining booking routes
// (slots/:date above is public, everything below requires admin)

// ─── GET / — List bookings (admin only) ───────────────────
bookingsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');

  const status = c.req.query('status') || '';
  const from = c.req.query('from') || '';
  const to = c.req.query('to') || '';
  const search = (c.req.query('search') || '').trim();
  const today = new Date().toISOString().slice(0, 10);

  // Build filter conditions
  const conditions: any[] = [];

  if (status && status !== 'all') {
    conditions.push(eq(coachingBookings.status, status as any));
  }

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${coachingBookings.customerName}) LIKE ${pattern}
        OR LOWER(${coachingBookings.customerEmail}) LIKE ${pattern}
      )`
    );
  }

  // Date range filtering
  if (from) {
    conditions.push(gte(coachingBookings.sessionDate, from));
  } else if (!to && !status) {
    // Default: show upcoming bookings (sessionDate >= today) when no filters applied
    conditions.push(gte(coachingBookings.sessionDate, today));
  }

  if (to) {
    conditions.push(lte(coachingBookings.sessionDate, to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch filtered bookings
  const bookings = await db
    .select()
    .from(coachingBookings)
    .where(whereClause)
    .orderBy(asc(coachingBookings.sessionDate), asc(coachingBookings.startTime))
    .all();

  // Compute stats across ALL bookings (unfiltered)
  const statsResult = await db
    .select({
      total: sql<number>`sum(CASE WHEN ${coachingBookings.status} != 'cancelled' THEN 1 ELSE 0 END)`,
      upcoming: sql<number>`sum(CASE WHEN ${coachingBookings.sessionDate} >= ${today} AND ${coachingBookings.status} IN ('pending', 'confirmed') THEN 1 ELSE 0 END)`,
      completed: sql<number>`sum(CASE WHEN ${coachingBookings.status} = 'completed' THEN 1 ELSE 0 END)`,
      cancelled: sql<number>`sum(CASE WHEN ${coachingBookings.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    })
    .from(coachingBookings)
    .get();

  return c.json({
    bookings,
    stats: {
      total: statsResult?.total ?? 0,
      upcoming: statsResult?.upcoming ?? 0,
      completed: statsResult?.completed ?? 0,
      cancelled: statsResult?.cancelled ?? 0,
    },
  });
});

// ─── GET /:id — Single booking detail (admin only) ────────
bookingsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const booking = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404);
  }

  return c.json(booking);
});

// ─── POST / — Create booking (admin only) ─────────────────
bookingsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const {
    customerName,
    customerEmail,
    customerId,
    coachingPackageId,
    sessionDate,
    startTime,
    endTime,
    notes,
    meetingUrl,
    customerNotes,
    timezone,
    clientId,
  } = body;

  if (!customerName || !customerEmail || !sessionDate || !startTime || !endTime) {
    return c.json({ error: 'customerName, customerEmail, sessionDate, startTime, and endTime are required' }, 400);
  }

  // Look up package name if coachingPackageId provided
  let packageName: string | null = null;
  if (coachingPackageId) {
    const pkg = await db
      .select({ title: coachingPackages.title })
      .from(coachingPackages)
      .where(eq(coachingPackages.id, coachingPackageId))
      .get();

    if (pkg) {
      packageName = pkg.title;
    }
  }

  // Validate no time conflict with existing bookings on the same date
  const conflicting = await db
    .select({ id: coachingBookings.id })
    .from(coachingBookings)
    .where(
      and(
        eq(coachingBookings.sessionDate, sessionDate),
        sql`${coachingBookings.status} != 'cancelled'`,
        sql`${coachingBookings.startTime} < ${endTime}`,
        sql`${coachingBookings.endTime} > ${startTime}`
      )
    )
    .get();

  if (conflicting) {
    return c.json({ error: 'Time conflict: another booking exists in this time slot' }, 409);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(coachingBookings)
    .values({
      id,
      customerId: customerId || null,
      customerName,
      customerEmail,
      coachingPackageId: coachingPackageId || null,
      packageName,
      sessionDate,
      startTime,
      endTime,
      timezone: timezone || 'Australia/Melbourne',
      status: 'confirmed',
      meetingUrl: meetingUrl || null,
      notes: notes || null,
      customerNotes: customerNotes || null,
      clientId: clientId || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  return c.json(created, 201);
});

// ─── PATCH /:id/status — Update booking status (admin only) ─
bookingsRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status: newStatus, cancelReason } = body;

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const existing = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Booking not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'cancelled') {
    updateData.cancelledAt = now;
    if (cancelReason) {
      updateData.cancelReason = cancelReason;
    }
  }

  await db
    .update(coachingBookings)
    .set(updateData)
    .where(eq(coachingBookings.id, id))
    .run();

  const updated = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  return c.json(updated);
});

// ─── PATCH /:id — Update booking details (admin only) ─────
bookingsRoutes.patch('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Booking not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.customerNotes !== undefined) updateData.customerNotes = body.customerNotes;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;
  if (body.sessionDate !== undefined) updateData.sessionDate = body.sessionDate;

  // If time or date changed, validate no conflict
  const newSessionDate = body.sessionDate || existing.sessionDate;
  const newStartTime = body.startTime || existing.startTime;
  const newEndTime = body.endTime || existing.endTime;

  if (body.sessionDate !== undefined || body.startTime !== undefined || body.endTime !== undefined) {
    const conflicting = await db
      .select({ id: coachingBookings.id })
      .from(coachingBookings)
      .where(
        and(
          eq(coachingBookings.sessionDate, newSessionDate),
          sql`${coachingBookings.status} != 'cancelled'`,
          sql`${coachingBookings.startTime} < ${newEndTime}`,
          sql`${coachingBookings.endTime} > ${newStartTime}`,
          sql`${coachingBookings.id} != ${id}`
        )
      )
      .get();

    if (conflicting) {
      return c.json({ error: 'Time conflict: another booking exists in this time slot' }, 409);
    }
  }

  await db
    .update(coachingBookings)
    .set(updateData)
    .where(eq(coachingBookings.id, id))
    .run();

  const updated = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  return c.json(updated);
});

// ─── DELETE /:id — Delete booking (admin only, hard delete) ─
bookingsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Booking not found' }, 404);
  }

  await db
    .delete(coachingBookings)
    .where(eq(coachingBookings.id, id))
    .run();

  return c.json({ success: true });
});
