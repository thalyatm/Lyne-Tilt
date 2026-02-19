import { Hono } from 'hono';
import { eq, desc, asc, sql, and, or, count } from 'drizzle-orm';
import { coachingPackages, coachingRevisions, coachingApplications, coachingClients, coachingBookings, applicationNotes, siteSettings } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { triggerAutomation } from '../utils/automations';
import { sendEmail } from '../utils/email';
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
      referredFrom: body.referredFrom || null,
    })
    .returning()
    .get();

  // Trigger coaching inquiry automation
  const queued = await triggerAutomation(db, 'coaching_inquiry', body.email.toLowerCase().trim(), body.name);

  // If no automation configured, send a direct confirmation email
  if (!queued) {
    const firstName = (body.name || 'there').split(' ')[0];
    try {
      await sendEmail(
        c.env,
        body.email.toLowerCase().trim(),
        'Your coaching enquiry has been received',
        `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1c1917;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Thanks, ${firstName}!</h1>
          <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
            I've received your coaching enquiry and I'm looking forward to connecting with you.
          </p>
          <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
            I'll be in touch within 24&ndash;48 hours to arrange a time for your complimentary strategy call. In the meantime, feel free to reply to this email with any questions.
          </p>
          <p style="color: #57534e; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Warm regards,<br/>
            <strong>Lyne</strong>
          </p>
          <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
            Lyne Tilt Studio &mdash; Wearable Art &amp; Creative Coaching
          </p>
        </div>`,
      );
    } catch (err) {
      console.error('Failed to send coaching confirmation email:', err);
    }
  }

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

// ─── POST /applications — Create application manually (admin only) ─

coachingRoutes.post('/applications', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');

  if (!body.name || !body.email) {
    return c.json({ error: 'Name and email are required' }, 400);
  }

  const now = new Date().toISOString();
  const application = await db.insert(coachingApplications).values({
    name: body.name,
    email: body.email,
    phone: body.phone || null,
    reason: body.reason || null,
    preferredPackage: body.preferredPackage || null,
    referredFrom: body.referredFrom || 'admin_manual',
    status: body.status || 'new',
    notes: body.notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  await logActivity(db, 'create', 'coaching_application', application, user);

  return c.json(application, 201);
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
  if (body.referredFrom !== undefined) updateData.referredFrom = body.referredFrom;
  if (body.scheduledCallAt !== undefined) updateData.scheduledCallAt = body.scheduledCallAt;
  if (body.scheduledCallTimezone !== undefined) updateData.scheduledCallTimezone = body.scheduledCallTimezone;

  // Auto-set status to 'scheduled' when call date is added and status is pre-scheduled
  if (body.scheduledCallAt && !body.status) {
    const preScheduledStatuses = ['new', 'contacted_retry', 'contacted_awaiting'];
    if (preScheduledStatuses.includes(existing.status)) {
      updateData.status = 'scheduled';
    }
  }

  // Auto-create a booking record when scheduling a discovery call
  if (body.scheduledCallAt && body.scheduledCallAt !== existing.scheduledCallAt) {
    const callDate = new Date(body.scheduledCallAt);
    const sessionDate = callDate.toISOString().split('T')[0];
    const hours = String(callDate.getUTCHours()).padStart(2, '0');
    const mins = String(callDate.getUTCMinutes()).padStart(2, '0');
    const startTime = `${hours}:${mins}`;
    const endMins = callDate.getUTCMinutes() + 30;
    const endH = callDate.getUTCHours() + Math.floor(endMins / 60);
    const endM = endMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const tz = body.scheduledCallTimezone || existing.scheduledCallTimezone || 'Australia/Sydney';

    // Delete old booking if rescheduling
    if (existing.bookingId) {
      await db.delete(coachingBookings).where(eq(coachingBookings.id, existing.bookingId)).run();
    }

    const bookingId = crypto.randomUUID();
    const now2 = new Date().toISOString();
    await db.insert(coachingBookings).values({
      id: bookingId,
      customerName: existing.name,
      customerEmail: existing.email,
      sessionDate,
      startTime,
      endTime,
      timezone: tz,
      status: 'confirmed',
      notes: `Discovery call${existing.reason ? ' — ' + existing.reason : ''}`,
      clientId: existing.clientId || null,
      createdAt: now2,
      updatedAt: now2,
    }).run();

    updateData.bookingId = bookingId;
  }

  // Handle promote-to-client when status set to complete_promoted
  if (body.status === 'complete_promoted' && !existing.clientId) {
    // Check if client with same email exists
    let clientId: string | null = null;
    const existingClient = await db
      .select()
      .from(coachingClients)
      .where(sql`LOWER(${coachingClients.email}) = ${existing.email.toLowerCase().trim()}`)
      .get();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const now = new Date().toISOString();
      const newClient = await db
        .insert(coachingClients)
        .values({
          id: crypto.randomUUID(),
          name: existing.name,
          email: existing.email,
          phone: existing.phone || null,
          source: 'website_form',
          status: 'discovery',
          notes: existing.reason || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
      clientId = newClient.id;
      await logActivity(db, 'create', 'coaching_client', newClient, user);
    }
    updateData.clientId = clientId;

    // Link any existing discovery call booking to the new client
    if (existing.bookingId) {
      await db
        .update(coachingBookings)
        .set({ clientId, updatedAt: new Date().toISOString() })
        .where(eq(coachingBookings.id, existing.bookingId))
        .run();
    }
  }

  const updated = await db
    .update(coachingApplications)
    .set(updateData)
    .where(eq(coachingApplications.id, id))
    .returning()
    .get();

  await logActivity(db, 'update', 'coaching_application', updated, user);

  return c.json(updated);
});

// ─── POST /applications/:id/promote — Convert application to coaching client ─

coachingRoutes.post('/applications/:id/promote', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  // 1. Get the application by ID
  const application = await db
    .select()
    .from(coachingApplications)
    .where(eq(coachingApplications.id, id))
    .get();

  if (!application) {
    return c.json({ error: 'Application not found' }, 404);
  }

  // 2. If application already has a clientId, return the existing client
  if (application.clientId) {
    const existingClient = await db
      .select()
      .from(coachingClients)
      .where(eq(coachingClients.id, application.clientId))
      .get();

    if (existingClient) {
      // Link discovery call booking to the client
      if (application.bookingId) {
        await db
          .update(coachingBookings)
          .set({ clientId: existingClient.id, updatedAt: new Date().toISOString() })
          .where(eq(coachingBookings.id, application.bookingId))
          .run();
      }
      return c.json(existingClient);
    }
  }

  // 3. Check if a coaching client with same email already exists
  const existingByEmail = await db
    .select()
    .from(coachingClients)
    .where(sql`LOWER(${coachingClients.email}) = ${application.email.toLowerCase().trim()}`)
    .get();

  if (existingByEmail) {
    // Link the application to the existing client
    await db
      .update(coachingApplications)
      .set({ clientId: existingByEmail.id, updatedAt: new Date().toISOString() })
      .where(eq(coachingApplications.id, id));

    // Link discovery call booking to the client
    if (application.bookingId) {
      await db
        .update(coachingBookings)
        .set({ clientId: existingByEmail.id, updatedAt: new Date().toISOString() })
        .where(eq(coachingBookings.id, application.bookingId))
        .run();
    }

    return c.json(existingByEmail);
  }

  // 4. Create new coaching client
  const now = new Date().toISOString();
  const newClient = await db
    .insert(coachingClients)
    .values({
      id: crypto.randomUUID(),
      name: application.name,
      email: application.email,
      phone: application.phone || null,
      source: 'website_form',
      status: 'discovery',
      notes: application.reason || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // 5. Update application's clientId and status
  await db
    .update(coachingApplications)
    .set({
      clientId: newClient.id,
      status: 'scheduled',
      updatedAt: now,
    })
    .where(eq(coachingApplications.id, id));

  // Link discovery call booking to the new client
  if (application.bookingId) {
    await db
      .update(coachingBookings)
      .set({ clientId: newClient.id, updatedAt: new Date().toISOString() })
      .where(eq(coachingBookings.id, application.bookingId))
      .run();
  }

  await logActivity(db, 'create', 'coaching_client', newClient, user);

  // 6. Return the new client with 201
  return c.json(newClient, 201);
});

// ─── GET /applications/:id/notes — List notes for an application ─────────

coachingRoutes.get('/applications/:id/notes', adminAuth, async (c) => {
  const db = c.get('db');
  const applicationId = c.req.param('id');

  const notes = await db
    .select()
    .from(applicationNotes)
    .where(eq(applicationNotes.applicationId, applicationId))
    .orderBy(desc(applicationNotes.createdAt))
    .all();

  return c.json(notes);
});

// ─── POST /applications/:id/notes — Add a note to an application ────────

coachingRoutes.post('/applications/:id/notes', adminAuth, async (c) => {
  const db = c.get('db');
  const applicationId = c.req.param('id');
  const user = c.get('user');
  const { content } = await c.req.json();

  if (!content?.trim()) {
    return c.json({ error: 'Note content is required' }, 400);
  }

  // Verify application exists
  const app = await db.select().from(coachingApplications).where(eq(coachingApplications.id, applicationId)).get();
  if (!app) {
    return c.json({ error: 'Application not found' }, 404);
  }

  const note = await db.insert(applicationNotes).values({
    applicationId,
    content: content.trim(),
    createdBy: user?.id || null,
    createdByName: user?.name || 'Admin',
  }).returning().get();

  return c.json(note, 201);
});

// ─── DELETE /applications/notes/:noteId — Delete a note ─────────────────

coachingRoutes.delete('/applications/notes/:noteId', adminAuth, async (c) => {
  const db = c.get('db');
  const noteId = c.req.param('noteId');

  await db.delete(applicationNotes).where(eq(applicationNotes.id, noteId)).run();

  return c.json({ success: true });
});

// ─── GET /calendar.ics — Public iCal feed (token-authenticated) ─────────

coachingRoutes.get('/calendar.ics', async (c) => {
  const db = c.get('db');
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Token is required' }, 401);
  }

  // Verify token against site settings
  const storedToken = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'calendarSyncToken'))
    .get();

  if (!storedToken || storedToken.value !== token) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Fetch confirmed/pending bookings
  const bookings = await db
    .select()
    .from(coachingBookings)
    .where(
      or(
        eq(coachingBookings.status, 'confirmed'),
        eq(coachingBookings.status, 'pending')
      )
    )
    .orderBy(desc(coachingBookings.sessionDate))
    .all();

  // Fetch scheduled application calls
  const applications = await db
    .select()
    .from(coachingApplications)
    .where(sql`${coachingApplications.scheduledCallAt} IS NOT NULL`)
    .all();

  // Build iCal
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lyne Tilt//Coaching Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Lyne Tilt Coaching',
    'X-WR-TIMEZONE:Australia/Melbourne',
  ];

  // Add bookings
  for (const booking of bookings) {
    const startDate = booking.sessionDate.replace(/-/g, '');
    const startTime = booking.startTime.replace(/:/g, '') + '00';
    const endTime = booking.endTime.replace(/:/g, '') + '00';
    const tzid = booking.timezone || 'Australia/Melbourne';

    const statusLabel = booking.status === 'pending' ? ' [PENDING]' : '';
    const summary = `Coaching: ${booking.customerName}${statusLabel}`;
    const description = [
      booking.packageName ? `Package: ${booking.packageName}` : '',
      `Email: ${booking.customerEmail}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
      booking.customerNotes ? `Client notes: ${booking.customerNotes}` : '',
    ].filter(Boolean).join('\\n');

    const location = booking.meetingUrl || '';

    ical.push(
      'BEGIN:VEVENT',
      `UID:booking-${booking.id}@lynetilt.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${tzid}:${startDate}T${startTime}`,
      `DTEND;TZID=${tzid}:${startDate}T${endTime}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : '',
      `STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    );
  }

  // Add scheduled application calls
  for (const app of applications) {
    if (!app.scheduledCallAt) continue;

    const callDate = new Date(app.scheduledCallAt);
    const startStr = callDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    // Assume 30-minute discovery calls
    const endDate = new Date(callDate.getTime() + 30 * 60 * 1000);
    const endStr = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const summary = `Discovery Call: ${app.name}`;
    const description = [
      `Email: ${app.email}`,
      app.phone ? `Phone: ${app.phone}` : '',
      app.reason ? `Reason: ${app.reason}` : '',
      app.preferredPackage ? `Preferred package: ${app.preferredPackage}` : '',
    ].filter(Boolean).join('\\n');

    ical.push(
      'BEGIN:VEVENT',
      `UID:application-${app.id}@lynetilt.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:TENTATIVE`,
      'END:VEVENT',
    );
  }

  ical.push('END:VCALENDAR');

  // Filter empty lines and join
  const icalBody = ical.filter(line => line !== '').join('\r\n');

  return new Response(icalBody, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="coaching-calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

// ─── GET /calendar-sync — Get calendar sync settings (admin) ─────────

coachingRoutes.get('/calendar-sync', adminAuth, async (c) => {
  const db = c.get('db');

  let tokenRow = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'calendarSyncToken'))
    .get();

  // Auto-generate token if it doesn't exist
  if (!tokenRow) {
    const newToken = crypto.randomUUID();
    await db.insert(siteSettings).values({
      key: 'calendarSyncToken',
      value: newToken,
      updatedAt: new Date().toISOString(),
    });
    tokenRow = { value: newToken };
  }

  return c.json({ token: tokenRow.value });
});

// ─── POST /calendar-sync/regenerate — Regenerate calendar sync token (admin) ─

coachingRoutes.post('/calendar-sync/regenerate', adminAuth, async (c) => {
  const db = c.get('db');
  const newToken = crypto.randomUUID();

  // Upsert the token
  const existing = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'calendarSyncToken'))
    .get();

  if (existing) {
    await db
      .update(siteSettings)
      .set({ value: newToken, updatedAt: new Date().toISOString() })
      .where(eq(siteSettings.key, 'calendarSyncToken'));
  } else {
    await db.insert(siteSettings).values({
      key: 'calendarSyncToken',
      value: newToken,
      updatedAt: new Date().toISOString(),
    });
  }

  return c.json({ token: newToken });
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

