# Coaching Clients Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Coaching Clients CRM page to the admin panel — a dedicated hub showing each client's journey, sessions, notes, and business metrics.

**Architecture:** New `coachingClients` and `clientNotes` D1 tables, a new Hono route file (`workers/src/routes/clients.ts`), and two new admin pages (ClientsManager list + ClientDetail page). Integrates with existing `coachingBookings` and `coachingApplications` via a `clientId` FK.

**Tech Stack:** Cloudflare Workers (Hono), D1/SQLite (Drizzle ORM), React + TypeScript + Tailwind CSS, Lucide icons.

---

### Task 1: Database Migration — Create tables & add FK columns

**Files:**
- Create: `workers/migrations/0025_coaching_clients.sql`
- Modify: `workers/src/db/schema.ts`

**Step 1: Write the migration SQL**

Create `workers/migrations/0025_coaching_clients.sql`:

```sql
-- Coaching Clients table
CREATE TABLE IF NOT EXISTS coaching_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  source TEXT NOT NULL DEFAULT 'other',
  current_package_id TEXT REFERENCES coaching_packages(id) ON DELETE SET NULL,
  goals TEXT,
  notes TEXT,
  communication_preference TEXT,
  important_dates TEXT DEFAULT '[]',
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS coaching_clients_status_idx ON coaching_clients(status);
CREATE INDEX IF NOT EXISTS coaching_clients_email_idx ON coaching_clients(email);

-- Client Notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES coaching_clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  session_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS client_notes_client_id_idx ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS client_notes_type_idx ON client_notes(type);

-- Add clientId FK to coaching_bookings
ALTER TABLE coaching_bookings ADD COLUMN client_id TEXT REFERENCES coaching_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_client_id_idx ON coaching_bookings(client_id);

-- Add clientId FK to coaching_applications
ALTER TABLE coaching_applications ADD COLUMN client_id TEXT REFERENCES coaching_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS applications_client_id_idx ON coaching_applications(client_id);
```

**Step 2: Add Drizzle schema definitions**

In `workers/src/db/schema.ts`, add after the `coachingApplications` section (~line 1275):

```typescript
// ============================================
// COACHING CLIENTS (CRM)
// ============================================

export const coachingClients = sqliteTable('coaching_clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: text('status', { enum: ['prospect', 'discovery', 'active', 'paused', 'completed'] }).notNull().default('prospect'),
  source: text('source', { enum: ['website_form', 'social_dm', 'referral', 'other'] }).notNull().default('other'),
  currentPackageId: text('current_package_id').references(() => coachingPackages.id, { onDelete: 'set null' }),
  goals: text('goals'),
  notes: text('notes'),
  communicationPreference: text('communication_preference'),
  importantDates: text('important_dates', { mode: 'json' }).$type<string[]>().default([]),
  startDate: text('start_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('coaching_clients_status_idx').on(table.status),
  emailIdx: index('coaching_clients_email_idx').on(table.email),
}));

export const clientNotes = sqliteTable('client_notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => coachingClients.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type', { enum: ['session', 'general', 'goal'] }).notNull().default('general'),
  sessionDate: text('session_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index('client_notes_client_id_idx').on(table.clientId),
  typeIdx: index('client_notes_type_idx').on(table.type),
}));
```

Also add `clientId` to the existing `coachingBookings` table definition (~line 1300):

```typescript
clientId: text('client_id').references(() => coachingClients.id, { onDelete: 'set null' }),
```

And add `clientId` to `coachingApplications` (~line 1260):

```typescript
clientId: text('client_id').references(() => coachingClients.id, { onDelete: 'set null' }),
```

Add relations at the bottom of the file:

```typescript
export const coachingClientsRelations = relations(coachingClients, ({ one, many }) => ({
  currentPackage: one(coachingPackages, { fields: [coachingClients.currentPackageId], references: [coachingPackages.id] }),
  notes: many(clientNotes),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(coachingClients, { fields: [clientNotes.clientId], references: [coachingClients.id] }),
}));
```

**Step 3: Apply migration locally**

Run: `cd /Users/thalya/DEV/Lyne-Tilt2/workers && npx wrangler d1 migrations apply lyne-tilt-db --local`

Expected: Migration applied successfully.

**Step 4: Commit**

```bash
git add workers/migrations/0025_coaching_clients.sql workers/src/db/schema.ts
git commit -m "feat: add coaching_clients and client_notes tables with migration"
```

---

### Task 2: API Routes — Clients CRUD + Notes

**Files:**
- Create: `workers/src/routes/clients.ts`
- Modify: `workers/src/index.ts` (register route)

**Step 1: Create the clients route file**

Create `workers/src/routes/clients.ts` with these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List clients (status filter, search, pagination) |
| POST | `/` | Create client |
| GET | `/:id` | Detail with computed metrics (session count, total spend from bookings) |
| PUT | `/:id` | Update client |
| DELETE | `/:id` | Delete client |
| GET | `/:id/notes` | List notes for client |
| POST | `/:id/notes` | Add note |
| PUT | `/:id/notes/:noteId` | Edit note |
| DELETE | `/:id/notes/:noteId` | Delete note |
| POST | `/:id/promote` | Change status (e.g. prospect -> active) |

**Key implementation details:**

- Import from schema: `coachingClients`, `clientNotes`, `coachingBookings`, `coachingPackages`
- All routes use `adminAuth` middleware
- Follow the same Hono pattern as `workers/src/routes/bookings.ts`
- List endpoint: support `?status=active&q=searchterm&page=1&pageSize=20`
- Detail endpoint: JOIN bookings to compute `sessionCount`, `completedSessions`, `totalSpend` (sum of package prices from completed bookings), `nextSession` (earliest future confirmed booking)
- IDs: `crypto.randomUUID()`
- Timestamps: `new Date().toISOString()`

**GET / (list) response shape:**
```json
{
  "clients": [...],
  "total": 15,
  "stats": {
    "total": 15,
    "prospect": 3,
    "discovery": 2,
    "active": 8,
    "paused": 1,
    "completed": 1
  }
}
```

Each client in the list includes:
- All columns from `coachingClients`
- `packageName`: joined from `coachingPackages.title`
- `sessionCount`: count of related `coachingBookings`
- `nextSessionDate`: earliest future `sessionDate` from confirmed bookings
- `lastSessionDate`: most recent past `sessionDate` from completed bookings

**GET /:id (detail) response shape:**
```json
{
  "client": { ...allColumns, "packageName": "..." },
  "sessions": [...bookings for this client],
  "stats": {
    "totalSessions": 12,
    "completedSessions": 10,
    "upcomingSessions": 2,
    "cancelledSessions": 0,
    "totalSpend": 0,
    "clientSince": "2025-06-01T..."
  }
}
```

**Step 2: Register the route in index.ts**

In `workers/src/index.ts`:
- Add import: `import { clientsRoutes } from './routes/clients';`
- Add route: `app.route('/api/clients', clientsRoutes);`

Place it near the other coaching-related routes (after line 134 `bookings`).

**Step 3: Test API locally**

Start workers dev: `cd /Users/thalya/DEV/Lyne-Tilt2/workers && npm run dev`

Test create:
```bash
curl -X POST http://localhost:8787/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Client","email":"test@example.com","phone":"0412345678","source":"social_dm","notes":"Met via Instagram DM"}'
```

Expected: 201 with the created client JSON.

Test list:
```bash
curl http://localhost:8787/api/clients -H "Authorization: Bearer <token>"
```

Expected: 200 with clients array and stats.

**Step 4: Commit**

```bash
git add workers/src/routes/clients.ts workers/src/index.ts
git commit -m "feat: add coaching clients API routes (CRUD + notes)"
```

---

### Task 3: Promote Application to Client endpoint

**Files:**
- Modify: `workers/src/routes/coaching.ts`

**Step 1: Add promote endpoint**

Add to the coaching routes (after the existing PATCH `/applications/:id` endpoint):

```typescript
// POST /applications/:id/promote — Convert application to coaching client
coachingRoutes.post('/applications/:id/promote', adminAuth, async (c) => {
  // 1. Get the application
  // 2. Check if a client with same email already exists
  //    - If yes, just link the application's clientId and return existing client
  // 3. Create new coachingClients row from application data
  //    - name, email, phone, source = 'website_form', status = 'discovery'
  // 4. Update application.clientId to new client ID
  // 5. Update application.status to 'scheduled'
  // 6. Return the new client
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/coaching.ts
git commit -m "feat: add promote application to client endpoint"
```

---

### Task 4: Admin Page — ClientsManager (list page)

**Files:**
- Create: `admin/pages/ClientsManager.tsx`
- Modify: `App.tsx` (add route)
- Modify: `admin/AdminLayout.tsx` (add nav item)

**Step 1: Create ClientsManager.tsx**

Follow the same patterns as `BookingsManager.tsx` and `CustomersManager.tsx`:

**Structure:**
1. Stats bar: 4 cards (Total, Active, Prospects, Completed) — use stone/gray color palette
2. Status filter tabs: All | Prospect | Discovery | Active | Paused | Completed
3. Search bar with debounce (search name/email)
4. Client list table with columns:
   - Name + email (stacked)
   - Status badge (color-coded: prospect=amber, discovery=blue, active=green, paused=stone, completed=emerald)
   - Package name
   - Sessions count
   - Next session date
   - Actions dropdown (View, Edit Status, Delete)
5. "Add Client" button opens a modal with fields: Name, Email, Phone, Source (dropdown), Notes (textarea)
6. Pagination (20 per page)

**Key details:**
- Use `API_BASE` from `../config/api`
- Use `useAuth()` for token
- Use `useNavigate()` for clicking through to detail page: `/admin/coaching/clients/${id}`
- Lucide icons: `Users`, `UserPlus`, `Search`, `Loader2`, `MoreHorizontal`, `Eye`, `Trash2`, etc.
- Tailwind: stone color palette, consistent with existing admin pages

**Step 2: Add route in App.tsx**

After the coaching routes (~line 158):
```tsx
import ClientsManager from './admin/pages/ClientsManager';
import ClientDetail from './admin/pages/ClientDetail';

// In the Route tree:
<Route path="coaching/clients" element={<ClientsManager />} />
<Route path="coaching/clients/:id" element={<ClientDetail />} />
```

**Step 3: Add nav item in AdminLayout.tsx**

In the Services section (~line 119), add Clients as a sub-item under Coaching:
```tsx
{ to: '/admin/coaching/clients', icon: Contact, label: 'Clients', sub: true },
```
Place it between Coaching and Bookings (after line 121, before line 122). Use `Contact` icon (already imported).

**Step 4: Commit**

```bash
git add admin/pages/ClientsManager.tsx App.tsx admin/AdminLayout.tsx
git commit -m "feat: add ClientsManager admin page with nav integration"
```

---

### Task 5: Admin Page — ClientDetail (detail page)

**Files:**
- Create: `admin/pages/ClientDetail.tsx`

**Step 1: Create ClientDetail.tsx**

Follow the same detail-page pattern as `CustomerDetail.tsx`:

**Layout:**

**Header section:**
- Back button (arrow left, navigates to `/admin/coaching/clients`)
- Client name (large), status badge, source tag
- Email (copyable), phone
- Edit button to toggle inline editing of name/email/phone

**Metrics row** (4 stat cards):
- Total Sessions | Completed | Upcoming | Client Since
- Use the stats from the `GET /api/clients/:id` response

**Tab navigation** with 4 tabs:

**Tab 1: Journey (default)**
- Visual timeline showing key events chronologically
- Events: "Client created", "Discovery call", "Became active", session dates, status changes
- Build from: client creation date, application data, booking dates
- Simple vertical timeline with dots and lines (like a commit log)

**Tab 2: Sessions**
- List of all bookings linked to this client (`sessions` from detail API)
- Each row: date, time, package name, status badge, notes preview
- "Book New Session" button at top — links to bookings page or opens modal
- Past sessions show notes; upcoming sessions are highlighted

**Tab 3: Notes**
- List of `clientNotes` sorted newest-first
- Each note shows: type badge (session/general/goal), date, content
- "Add Note" button opens inline form: type dropdown + textarea + optional session date (if type=session)
- Edit/delete per note with inline editing

**Tab 4: Profile**
- Editable form fields:
  - Status (dropdown)
  - Source (dropdown)
  - Current Package (dropdown, fetched from coaching packages)
  - Goals (textarea)
  - Communication Preference (text)
  - Start Date (date input)
- Auto-save on blur (same pattern as CoachingEditor autosave)

**Step 2: Commit**

```bash
git add admin/pages/ClientDetail.tsx
git commit -m "feat: add ClientDetail admin page with journey, sessions, notes, profile tabs"
```

---

### Task 6: Integration — Link Bookings to Clients

**Files:**
- Modify: `admin/pages/BookingsManager.tsx` (small change)
- Modify: `workers/src/routes/bookings.ts` (small change)

**Step 1: Update bookings list to show client link**

In `BookingsManager.tsx`, when rendering the customer name in the bookings table:
- If the booking has a `clientId`, make the name a clickable link to `/admin/coaching/clients/${clientId}`
- Add a small icon (e.g., `ExternalLink` size 12) next to the name

**Step 2: Update bookings API to return clientId**

In `workers/src/routes/bookings.ts`, ensure the GET `/` endpoint selects and returns `clientId` from `coachingBookings`.

**Step 3: Update create booking to accept clientId**

In the POST `/` endpoint in `bookings.ts`, accept optional `clientId` in the request body and store it.

**Step 4: Commit**

```bash
git add admin/pages/BookingsManager.tsx workers/src/routes/bookings.ts
git commit -m "feat: link bookings to coaching clients"
```

---

### Task 7: Integration — Promote Application action

**Files:**
- Modify: `admin/pages/CoachingManager.tsx` (if applications are managed here)

**Step 1: Find where coaching applications are displayed**

Check if applications are shown in `CoachingManager.tsx` or in a separate section. Add a "Promote to Client" action button in the application row's actions menu.

**Step 2: Add promote action**

When clicked:
- Call `POST /api/coaching/applications/:id/promote`
- Show success toast
- Optionally navigate to the new client's detail page

**Step 3: Commit**

```bash
git add admin/pages/CoachingManager.tsx
git commit -m "feat: add promote-to-client action for coaching applications"
```

---

### Task 8: Final Polish & Verification

**Step 1: Start both dev servers**

```bash
cd /Users/thalya/DEV/Lyne-Tilt2/workers && npm run dev
# In another terminal:
cd /Users/thalya/DEV/Lyne-Tilt2 && npm run dev
```

**Step 2: Manual verification checklist**

- [ ] Navigate to `/admin/coaching/clients` — page loads with empty state
- [ ] Click "Add Client" — modal opens, fill in details, submit
- [ ] New client appears in list with correct status badge
- [ ] Click client row — navigates to detail page
- [ ] All 4 tabs work (Journey, Sessions, Notes, Profile)
- [ ] Add a note — appears in notes tab
- [ ] Edit profile fields — saves correctly
- [ ] Status filter tabs work
- [ ] Search works
- [ ] Nav item "Clients" appears under Coaching in sidebar
- [ ] Bookings page shows client links where applicable

**Step 3: Final commit if any polish needed**

```bash
git add -A
git commit -m "feat: polish coaching clients pages"
```

---

## Task Dependency Order

```
Task 1 (DB migration)
  └─> Task 2 (API routes)
       ├─> Task 3 (Promote endpoint)
       ├─> Task 4 (ClientsManager page)
       │    └─> Task 5 (ClientDetail page)
       └─> Task 6 (Bookings integration)
  Task 3 ─> Task 7 (Promote UI)
  All ─> Task 8 (Verification)
```

Tasks 3, 4, and 6 can run in parallel after Task 2 completes.
Tasks 5 depends on Task 4 (needs the route registered).
Task 7 depends on Task 3.
Task 8 runs after everything else.
