# Coaching Bookings UX Improvement Design

## Problem

The coaching admin workflow is fragmented across 4 pages (Coaching packages, Applications, Clients, Bookings) with no context-awareness between them. Creating bookings requires manual data entry even when the client/applicant is known. Discovery calls scheduled in Applications don't create booking records.

## Solution: Smart Booking Modal + Cross-Page Integration

### 1. Shared BookSessionModal Component

A context-aware modal reused across all coaching pages:

| Opened from | Pre-fills |
|---|---|
| Client Detail Sessions tab | clientId, name, email, package, duration |
| Applications "Schedule Discovery Call" | applicationId, name, email, type=discovery |
| Bookings page "New Booking" | Nothing — shows client search dropdown |

**Fields:** Client (pre-filled or searchable dropdown), Package (dropdown, auto-selected from client), Session Date, Start Time, End Time (auto-calculated from package duration), Meeting URL, Notes, Session Type tag.

### 2. Client Detail Sessions Tab Upgrade

- "Book Session" button opens BookSessionModal (pre-filled) instead of navigating away
- Upcoming sessions section at top with quick actions (Confirm, Cancel, inline status change)
- Past sessions below in reverse chronological order
- Meeting URL shown as clickable link

### 3. Application Discovery Call → Booking Sync

- When admin schedules a discovery call, backend auto-creates a coachingBookings record
- Application stores bookingId reference
- When promoted to client, booking gets clientId updated
- UI shows "View Booking" link next to scheduled call

**Schema change:** Add `bookingId` column to `coachingApplications`.

### 4. Bookings Page Client Picker

- Replace manual name/email with searchable client picker
- Auto-fills name, email, package when client selected
- "Custom" option for non-client one-off bookings
- Backend: POST /api/bookings accepts clientId and coachingPackageId

## Scope

- Frontend: BookSessionModal component, ClientDetail Sessions tab, ApplicationsManager scheduling, BookingsManager create form
- Backend: POST /api/bookings (add clientId/packageId), PUT /api/coaching/applications/:id (auto-create booking), POST /api/coaching/applications/:id/promote (link booking to client)
- Migration: Add bookingId to coachingApplications
