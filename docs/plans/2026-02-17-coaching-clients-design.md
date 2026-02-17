# Coaching Clients Page — Design

## Problem

Coaching clients are currently scattered across Bookings (sessions), Coaching Applications (discovery calls), and Customers (e-commerce). There's no single place to see a client's full journey, prep for sessions, or track coaching-specific metrics. This creates mental load before every session.

## Requirements

- **Client journey overview**: See where each client is (prospect, discovery, active, paused, completed)
- **Business metrics**: Total spend, session count, sessions remaining per client
- **Full client profiles**: Goals, session notes, personal context, communication preferences
- **Two entry paths**: Website discovery call applications AND manual entry for social media DM leads
- **Volume**: 5-20 active clients — rich per-client view, list + detail page pattern
- **Integration**: Link to existing bookings, auto-connect discovery call applications

## Architecture Decision

**Dedicated `coachingClients` table** — not reusing `customerUsers`.

Coaching clients are a fundamentally different relationship than shop customers. A dedicated table keeps the Clients page focused on coaching without e-commerce noise. Links to existing bookings and applications via foreign keys.

## Data Model

### New table: `coachingClients`

| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | Primary key |
| name | text | Required |
| email | text | Required |
| phone | text | Optional |
| status | text (enum) | prospect, discovery, active, paused, completed |
| source | text (enum) | website_form, social_dm, referral, other |
| currentPackageId | text | FK to coachingPackages (nullable) |
| goals | text | Free-text coaching goals |
| notes | text | Rich text ongoing notes |
| communicationPreference | text | How they prefer to be contacted |
| importantDates | text | JSON string of key dates |
| startDate | text | When they became a client (ISO) |
| createdAt | text | ISO timestamp |
| updatedAt | text | ISO timestamp |

### New table: `clientNotes`

| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | Primary key |
| clientId | text | FK to coachingClients |
| content | text | Note content |
| type | text (enum) | session, general, goal |
| sessionDate | text | If type=session, the session date |
| createdAt | text | ISO timestamp |
| updatedAt | text | ISO timestamp |

### Schema changes to existing tables

- `coachingBookings`: Add `clientId` text column (FK to coachingClients, nullable)
- `coachingApplications`: Add `clientId` text column (FK to coachingClients, nullable)

## Pages

### Client List — `/admin/coaching/clients`

**Stats bar** (4 cards):
- Total Clients | Active | Prospects | Completed

**List view** — each row:
- Name, email, status badge
- Current package name
- Next session date (or "None scheduled")
- Total sessions | Total spend
- Last contact date

**Actions**:
- "Add Client" button (modal with: name, email, phone, source, notes)
- Filter by status tabs
- Search by name/email

### Client Detail — `/admin/coaching/clients/:id`

**Header**: Name, status badge, email, phone, source tag, Edit button

**Metrics row**: Total spend | Sessions completed | Sessions remaining | Client since

**Sections/Tabs**:

1. **Journey** (default) — Timeline of key events: application, discovery call, became active, sessions, package changes
2. **Sessions** — All bookings for this client (past + upcoming), with session notes. Button to create new booking pre-filled with client info
3. **Notes** — Timestamped notes with type tags (session/general/goal). Rich text entry
4. **Profile** — Editable contact info, goals, source, communication preferences, important dates

## API Endpoints

### Clients CRUD
- `GET /api/coaching/clients` — List with status filter, search, pagination
- `POST /api/coaching/clients` — Create new client
- `GET /api/coaching/clients/:id` — Full detail with computed metrics
- `PUT /api/coaching/clients/:id` — Update client
- `DELETE /api/coaching/clients/:id` — Soft delete / archive

### Client Notes
- `GET /api/coaching/clients/:id/notes` — List notes for client
- `POST /api/coaching/clients/:id/notes` — Add note
- `PUT /api/coaching/clients/:id/notes/:noteId` — Edit note
- `DELETE /api/coaching/clients/:id/notes/:noteId` — Delete note

### Promotion
- `POST /api/coaching/applications/:id/promote` — Convert application to client record

## Integration Points

- **Bookings page**: Client name becomes a clickable link to client profile
- **New Booking form**: Can search/select existing client to pre-fill info
- **Coaching Applications**: "Promote to Client" action creates client record and links the application
- **Client Detail → Sessions**: Create booking pre-filled with client info
- **Admin nav**: "Clients" appears under Services > Coaching

## What This Reduces

**Before**: Check Bookings for time, look at Applications for context, try to remember notes, check payment status — across multiple pages.

**After**: Open Clients → click client → full journey, sessions, notes, spend, goals in one place.
