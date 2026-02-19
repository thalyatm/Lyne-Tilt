# Coaching Bookings UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a seamless coaching booking experience by adding a shared Smart Booking Modal, upgrading the Client Detail sessions tab, syncing discovery calls to bookings, and adding a client picker to the Bookings page.

**Architecture:** A shared `BookSessionModal` React component is used from 3 entry points (Client Detail, Applications, Bookings page). Each entry point passes context-specific props to pre-fill relevant fields. On the backend, the existing `POST /api/bookings` endpoint already accepts `clientId` and `coachingPackageId` — no changes needed there. The `PUT /api/coaching/applications/:id` endpoint gets extended to auto-create booking records when discovery calls are scheduled.

**Tech Stack:** React + TypeScript frontend, Hono API on Cloudflare Workers, Drizzle ORM with D1/SQLite.

---

## Task 1: DB Migration — Add bookingId to coachingApplications

**Files:**
- Create: `workers/migrations/0030_applications_booking_id.sql`
- Modify: `workers/src/db/schema.ts:1262-1282`

**Step 1: Create the migration file**

```sql
-- Add bookingId column to coaching_applications for linking discovery call bookings
ALTER TABLE coaching_applications ADD COLUMN booking_id TEXT REFERENCES coaching_bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS applications_booking_id_idx ON coaching_applications(booking_id);
```

Save to `workers/migrations/0030_applications_booking_id.sql`.

**Step 2: Update the Drizzle schema**

In `workers/src/db/schema.ts`, add the `bookingId` column to the `coachingApplications` table definition (after `clientId` on line 1274):

```typescript
bookingId: text('booking_id').references(() => coachingBookings.id, { onDelete: 'set null' }),
```

Also add to the table's index block:

```typescript
bookingIdIdx: index('applications_booking_id_idx').on(table.bookingId),
```

**Step 3: Apply migration locally**

Run: `cd workers && npx wrangler d1 migrations apply lyne-tilt-db --local`

**Step 4: Commit**

```bash
git add workers/migrations/0030_applications_booking_id.sql workers/src/db/schema.ts
git commit -m "feat: add bookingId column to coaching_applications"
```

---

## Task 2: Backend — Auto-create booking when discovery call scheduled

**Files:**
- Modify: `workers/src/routes/coaching.ts:239-313` (PUT /applications/:id handler)

**Step 1: Extend the PUT /applications/:id handler**

After the auto-status-set logic (line 266), add booking creation when `scheduledCallAt` is being set. Insert this logic block:

```typescript
// Auto-create a booking record when scheduling a discovery call
if (body.scheduledCallAt && body.scheduledCallAt !== existing.scheduledCallAt) {
  // Parse scheduledCallAt into date and time parts
  const callDate = new Date(body.scheduledCallAt);
  const sessionDate = callDate.toISOString().split('T')[0];
  const hours = String(callDate.getUTCHours()).padStart(2, '0');
  const mins = String(callDate.getUTCMinutes()).padStart(2, '0');
  const startTime = `${hours}:${mins}`;
  // Discovery calls default to 30 minutes
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
  const now = new Date().toISOString();
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
    createdAt: now,
    updatedAt: now,
  }).run();

  updateData.bookingId = bookingId;
}
```

Also add the `coachingBookings` import at the top of the file if not already present.

**Step 2: Update promote handler to link booking to client**

In the PUT handler's promote-to-client block (lines 268-301), after setting `updateData.clientId = clientId`, add:

```typescript
// Link any existing discovery call booking to the new client
if (existing.bookingId) {
  await db
    .update(coachingBookings)
    .set({ clientId, updatedAt: new Date().toISOString() })
    .where(eq(coachingBookings.id, existing.bookingId))
    .run();
}
```

Do the same in the POST /applications/:id/promote handler (lines 317-395) — after the clientId is determined, check if the application has a bookingId and update it.

**Step 3: Test manually**

Start workers dev server: `cd workers && npm run dev`

Test with curl:
```bash
# Create a test application first, then update with scheduledCallAt
curl -X PUT http://localhost:8787/api/coaching/applications/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"scheduledCallAt": "2026-03-01T10:00:00Z", "scheduledCallTimezone": "Australia/Melbourne"}'
```

Verify a booking record was created.

**Step 4: Commit**

```bash
git add workers/src/routes/coaching.ts
git commit -m "feat: auto-create booking when scheduling discovery call"
```

---

## Task 3: Frontend — BookSessionModal shared component

**Files:**
- Create: `admin/components/BookSessionModal.tsx`

**Step 1: Build the modal component**

Create `admin/components/BookSessionModal.tsx`. This is the core shared component used across all coaching pages.

Props interface:
```typescript
interface BookSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // callback to refresh parent data after booking created
  // Pre-fill context (all optional)
  clientId?: string | null;
  clientName?: string;
  clientEmail?: string;
  packageId?: string | null;
  packageName?: string | null;
  durationMinutes?: number | null;
  sessionType?: 'coaching' | 'discovery';
  applicationId?: string | null;
}
```

Component structure:
1. **Client section** — If `clientId` provided, show read-only client badge. Otherwise, show a searchable input that fetches from `GET /api/clients?q=<search>&pageSize=10` with a debounced dropdown. Include a "Custom (non-client)" toggle that reveals manual name/email fields.
2. **Package dropdown** — Fetch published packages from `GET /api/coaching?all=true&status=published`. Pre-select from props if `packageId` provided. When selected, auto-set duration.
3. **Date/time fields** — Session Date (date input), Start Time (time input), End Time (auto-calculated from start + package duration, editable).
4. **Meeting URL** — Optional text input.
5. **Notes** — Optional textarea.
6. **Session type tag** — Small visual indicator: "Coaching Session" or "Discovery Call" (auto-set from props, not editable).
7. **Submit** — POST to `${API_BASE}/bookings` with all fields including `clientId` and `coachingPackageId`. Call `onCreated()` on success.

Follow existing modal patterns:
- Use `useAuth()` for access token
- Brand color `#8d3038` for primary button
- `Loader2` spinning icon for loading state
- Same Tailwind input classes as BookingsManager (`border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1`)
- Fixed overlay with backdrop click to close

**Step 2: Commit**

```bash
git add admin/components/BookSessionModal.tsx
git commit -m "feat: add shared BookSessionModal component"
```

---

## Task 4: Frontend — Integrate modal into Client Detail Sessions tab

**Files:**
- Modify: `admin/pages/ClientDetail.tsx:784-872`

**Step 1: Add modal state and import**

At the top of `ClientDetail.tsx`, add:
```typescript
import BookSessionModal from '../components/BookSessionModal';
```

In the component state section, add:
```typescript
const [bookModalOpen, setBookModalOpen] = useState(false);
```

**Step 2: Replace "Book New Session" button navigation with modal open**

Change the button at line 794-803 from:
```typescript
onClick={() => navigate('/admin/bookings')}
```
to:
```typescript
onClick={() => setBookModalOpen(true)}
```

**Step 3: Add the modal render**

After the Sessions tab closing `</div>` (around line 872), add:
```typescript
<BookSessionModal
  open={bookModalOpen}
  onClose={() => setBookModalOpen(false)}
  onCreated={() => {
    setBookModalOpen(false);
    fetchClient(); // refresh sessions list
  }}
  clientId={client?.id}
  clientName={client?.name}
  clientEmail={client?.email}
  packageId={client?.currentPackageId}
  packageName={client?.packageName}
  durationMinutes={null}
/>
```

**Step 4: Upgrade Sessions tab with upcoming/past split and inline status**

Replace the sessions table (lines 812-869) with an improved layout:
- Split sessions into `upcoming` (future date + pending/confirmed) and `past` (everything else)
- Show upcoming first with blue-tinted cards, each with: date/time, package, status badge, meeting URL link, and a status dropdown for quick actions (Confirm, Complete, Cancel, No Show)
- Show past sessions below in a standard table
- Status change calls `PATCH /api/bookings/:id/status` (same endpoint used by BookingsManager)

**Step 5: Commit**

```bash
git add admin/pages/ClientDetail.tsx
git commit -m "feat: inline booking modal and improved sessions tab in ClientDetail"
```

---

## Task 5: Frontend — Integrate modal into Bookings page with client picker

**Files:**
- Modify: `admin/pages/BookingsManager.tsx:187-731`

**Step 1: Replace the create booking form with BookSessionModal**

Import the modal:
```typescript
import BookSessionModal from '../components/BookSessionModal';
```

Replace the create modal state (`createModalOpen`, `createForm`, `createSaving`) and the inline modal JSX (lines 602-732) with:
```typescript
<BookSessionModal
  open={createModalOpen}
  onClose={() => setCreateModalOpen(false)}
  onCreated={() => {
    setCreateModalOpen(false);
    fetchBookings();
  }}
/>
```

Remove the `handleCreateBooking` function (lines 326-363) and the `createForm`/`createSaving` state (lines 206-215) since the modal handles everything internally.

Keep `createModalOpen` / `setCreateModalOpen` state since the "New Booking" button still uses it.

**Step 2: Commit**

```bash
git add admin/pages/BookingsManager.tsx
git commit -m "feat: replace booking form with shared BookSessionModal on Bookings page"
```

---

## Task 6: Frontend — Wire discovery call scheduling in Applications to use modal

**Files:**
- Modify: `admin/pages/ApplicationsManager.tsx`

**Step 1: Add "View Booking" link**

When an application has a `bookingId` (returned from the API after scheduling), show a small link next to the scheduled call datetime:
```typescript
{app.bookingId && (
  <Link to="/admin/bookings" className="text-xs text-[#8d3038] hover:underline ml-2">
    View Booking
  </Link>
)}
```

The application type interface needs `bookingId?: string | null` added.

**Step 2: Verify discovery call → booking flow**

When the admin sets `scheduledCallAt` in the inline schedule picker (existing UI), the PUT request already sends the data to the backend which now auto-creates a booking. The frontend just needs to read back the `bookingId` from the response and update local state.

After the PUT response, update the local application object with the returned `bookingId`.

**Step 3: Commit**

```bash
git add admin/pages/ApplicationsManager.tsx
git commit -m "feat: show booking link for scheduled discovery calls in Applications"
```

---

## Task 7: Deploy and verify end-to-end

**Step 1: Apply migration to remote**

```bash
cd workers && npx wrangler d1 migrations apply lyne-tilt-db --remote
```

**Step 2: Deploy workers**

```bash
cd workers && npm run deploy
```

**Step 3: Deploy frontend**

```bash
npm run build && npx wrangler pages deploy dist --project-name=lyne-tilt
```

**Step 4: Verify the full flow**

1. Go to Applications → schedule a discovery call → verify booking appears in Bookings page
2. Promote application to client → verify booking now shows client link
3. Go to Client Detail → Sessions tab → click "Book Session" → verify modal pre-fills client info
4. Go to Bookings page → click "New Booking" → verify client search dropdown works
5. Create a booking with package selected → verify end time auto-calculates
