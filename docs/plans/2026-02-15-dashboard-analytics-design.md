# Dashboard vs Analytics Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Differentiate Dashboard (operational command center) from AnalyticsHub (strategic trends overview) by removing overlap and sharpening each page's purpose.

**Architecture:** Dashboard fetches from `/api/dashboard/overview` with fixed 30-day window; AnalyticsHub fetches from `/api/analytics/overview` with configurable date ranges. Backend changes add upcoming bookings to dashboard and AOV + services summary to analytics.

**Tech Stack:** React, TypeScript, Recharts, Hono (Cloudflare Workers), Drizzle ORM (D1/SQLite)

---

## Task 1: Add upcoming bookings + pending orders to Dashboard API

**Files:**
- Modify: `workers/src/routes/dashboard.ts` (lines 38-292, the `/overview` endpoint)

**Step 1: Add imports for coachingBookings and enrollments**

At the top of `dashboard.ts`, add `coachingBookings` to the import:

```typescript
import {
  products,
  blogPosts,
  coachingPackages,
  learnItems,
  testimonials,
  faqs,
  subscribers,
  contactSubmissions,
  activityLog,
  orders,
  campaigns,
  sentEmails,
  emailAutomations,
  automationQueue,
  coachingBookings,
  enrollments,
  cohorts,
  cohortSessions,
} from '../db/schema';
```

**Step 2: Add upcoming bookings + pending orders queries**

Inside the `/overview` handler, after the existing warnings section (around line 247), add:

```typescript
// ── Upcoming bookings (next 7 days) ───────────────────
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
const nowISO = new Date().toISOString();
const futureISO = sevenDaysFromNow.toISOString();

const [upcomingBookings, pendingOrders] = await Promise.all([
  // Coaching bookings in next 7 days
  db.select({
    id: coachingBookings.id,
    customerName: coachingBookings.customerName,
    scheduledAt: coachingBookings.scheduledAt,
    status: coachingBookings.status,
  })
    .from(coachingBookings)
    .where(and(
      gte(coachingBookings.scheduledAt, nowISO),
      sql`${coachingBookings.scheduledAt} <= ${futureISO}`,
      sql`${coachingBookings.status} IN ('confirmed', 'pending')`,
    ))
    .orderBy(coachingBookings.scheduledAt)
    .limit(5)
    .all().catch(() => []),
  // Pending orders
  db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    customerName: orders.customerName,
    total: orders.total,
    status: orders.status,
    createdAt: orders.createdAt,
  })
    .from(orders)
    .where(sql`${orders.status} IN ('pending', 'processing')`)
    .orderBy(desc(orders.createdAt))
    .limit(5)
    .all().catch(() => []),
]);
```

**Step 3: Add the new data to the response**

In the `return c.json({...})` block, add these fields alongside the existing `ops` field:

```typescript
schedule: {
  upcoming_bookings: upcomingBookings.map(b => ({
    id: b.id,
    customer_name: b.customerName,
    scheduled_at: b.scheduledAt,
    status: b.status,
    href: '/admin/bookings',
  })),
},
orders: {
  pending: pendingOrders.map(o => ({
    id: o.id,
    order_number: o.orderNumber,
    customer_name: o.customerName,
    total: o.total,
    status: o.status,
    created_at: o.createdAt,
    href: `/admin/orders/${o.id}`,
  })),
},
```

**Step 4: Verify the worker builds**

Run: `cd workers && npx wrangler deploy --dry-run`
Expected: Build succeeds without errors

---

## Task 2: Add AOV + services summary to Analytics API

**Files:**
- Modify: `workers/src/routes/analytics.ts` (the `/overview` endpoint, around line 172-400)

**Step 1: Add AOV calculation**

In the `/overview` handler, after the existing revenue query results are computed (around line 288), add AOV calculation:

```typescript
// AOV = revenue / orders (current and previous)
const aovCurr = (ordersCurr?.value ?? 0) > 0
  ? (revenueCurr?.value ?? 0) / (ordersCurr?.value ?? 0)
  : 0;
const aovPrev = (ordersPrev?.value ?? 0) > 0
  ? (revenuePrev?.value ?? 0) / (ordersPrev?.value ?? 0)
  : 0;
```

**Step 2: Add services summary queries**

After the subscribers queries (around line 370), add:

```typescript
// ── Services summary ─────────────────────────────────
const [workshopEnrollments, coachingBookingsCount] = await Promise.all([
  db.select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(and(gte(enrollments.enrolledAt, from), lte(enrollments.enrolledAt, to)))
    .get().catch(() => ({ count: 0 })),
  db.select({ count: sql<number>`count(*)` })
    .from(coachingBookings)
    .where(and(gte(coachingBookings.createdAt, from), lte(coachingBookings.createdAt, to)))
    .get().catch(() => ({ count: 0 })),
]);
```

Add the import for `coachingBookings` at the top of `analytics.ts` if not already present.

**Step 3: Add AOV + services to the response**

In the `return c.json({...})` response object, add AOV to kpis:

```typescript
aov: {
  value: aovCurr,
  change: pctChange(aovCurr, aovPrev),
},
```

And add services summary at the top level of the response:

```typescript
services: {
  workshopEnrollments: workshopEnrollments?.count ?? 0,
  coachingBookings: coachingBookingsCount?.count ?? 0,
},
```

**Step 4: Verify the worker builds**

Run: `cd workers && npx wrangler deploy --dry-run`
Expected: Build succeeds without errors

---

## Task 3: Rewrite Dashboard.tsx — operational command center

**Files:**
- Modify: `admin/pages/Dashboard.tsx` (full rewrite)

**Goal:** Transform from a charts-heavy analytics clone into a lean operational page focused on "what needs attention now."

**Layout structure (top to bottom):**

1. **Greeting + refresh** (keep existing pattern)
2. **Attention needed** (warnings — promoted to top, was at bottom)
3. **4 KPI cards** — Revenue (30d), Orders (30d), Subscribers (total, +new), Upcoming Bookings (count)
   - No sparkline charts, just numbers with subtle subtitles
4. **Two-column section:**
   - **Left: Pending Orders** — list of pending/processing orders with customer name, total, time ago, link to order
   - **Right: Upcoming Schedule** — list of next coaching bookings with customer name, date, status
5. **Quick Actions** (keep existing 2x3 grid)
6. **Recently Updated** (keep existing activity feed)

**What to remove:**
- All 3 Recharts area/bar charts (revenue, subscribers, email activity)
- Email KPI cards (open rate, click rate, emails sent) — belong in analytics
- Active Campaigns section — belongs in campaigns page
- Automations Health boxes — failing automations are already in warnings

**What to add:**
- Upcoming bookings KPI card + schedule list
- Pending orders list
- Move warnings to right below greeting

**Key implementation notes:**
- Remove `AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid` from Recharts imports (no longer needed)
- Remove `Mail, Eye, MousePointerClick` icon imports
- Keep `ChartTooltip` removal, `chartTickFormatter` removal
- Add types for `UpcomingBooking` and `PendingOrder` to the `DashboardOverview` interface
- Update interface to include `schedule` and `orders` from new API response

---

## Task 4: Refine AnalyticsHub.tsx — strategic trends overview

**Files:**
- Modify: `admin/pages/AnalyticsHub.tsx`

**Changes from current:**

1. **Add AOV KPI card** — insert between Orders and Visitors:
   ```
   { label: 'AOV', value: formatCurrency(kpis.aov.value), change: kpis.aov.change, icon: TrendingUp, ... }
   ```
   Grid changes from 5 to 6 columns: `lg:grid-cols-6`

2. **Replace Subscriber Overview section** with **Services Summary**:
   - Remove the "Subscriber Overview" card (total + new in period)
   - Add a "Services" summary card showing:
     - Workshop Enrollments count in period
     - Coaching Bookings count in period
     - "View details →" link to `/admin/analytics/services`

3. **Update types** — add to `OverviewData` interface:
   ```typescript
   kpis: {
     // existing...
     aov: KpiValue;
   };
   services: {
     workshopEnrollments: number;
     coachingBookings: number;
   };
   ```

4. **Swap Subscribers KPI for New Subscribers** — change the Visitors KPI to show "New Subscribers" instead, since visitors data requires analytics events which may be sparse:
   - Keep Visitors if data exists, just ensure the KPI card label is clear

---

## Task 5: Deploy and verify

**Step 1: Deploy workers**

Run: `cd workers && npm run deploy`
Expected: Successful deployment

**Step 2: Build and deploy frontend**

Run: `VITE_API_BASE=https://lyne-tilt-api.verdant-digital-co.workers.dev/api npm run build && npx wrangler pages deploy dist --project-name=lyne-tilt`
Expected: Successful build and deployment

**Step 3: Verify**
- Dashboard shows greeting, warnings at top, 4 KPI cards, pending orders, upcoming bookings, quick actions, recent activity. No charts.
- AnalyticsHub shows date range selector, 6 KPI cards with % change, revenue chart, top products, email performance, top posts, services summary.
