# Analytics Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive analytics suite for the Lyne-Tilt admin centre with event tracking, an analytics hub, and deep-dive pages for revenue, email, content, customers, and services.

**Architecture:** Hub + Domain Pages pattern — a central analytics overview linking to focused deep-dive pages. Lightweight frontend event tracker for page views and interactions. All data served via Hono API endpoints querying D1.

**Tech Stack:** Hono (Workers API), Drizzle ORM + D1 (SQLite), React + Recharts + Lucide, inline Tailwind-style classes matching existing admin aesthetic.

**Design Doc:** `docs/plans/2026-02-13-analytics-suite-design.md`

---

## Phase 1: Database & Event Tracking Infrastructure

### Task 1: Create analytics_events migration

**Files:**
- Create: `workers/migrations/0005_analytics_events.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration: Analytics Events Tracking
-- =========================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  session_id TEXT NOT NULL,
  referrer TEXT,
  pathname TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_entity_idx ON analytics_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_pathname_idx ON analytics_events(pathname);
```

**Step 2: Apply migration locally**

Run: `cd workers && npx wrangler d1 migrations apply lyne-tilt-db --local`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add workers/migrations/0005_analytics_events.sql
git commit -m "feat: add analytics_events migration"
```

### Task 2: Add analytics_events to Drizzle schema

**Files:**
- Modify: `workers/src/db/schema.ts` (append at end, before any final exports)

**Step 1: Add the table definition**

Add to the bottom of `workers/src/db/schema.ts`:

```typescript
// ============================================
// ANALYTICS & TRACKING
// ============================================

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType: text('event_type', {
    enum: ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'blog_read', 'search'],
  }).notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  sessionId: text('session_id').notNull(),
  referrer: text('referrer'),
  pathname: text('pathname').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  typeIdx: index('analytics_events_type_idx').on(table.eventType),
  entityIdx: index('analytics_events_entity_idx').on(table.entityType, table.entityId),
  sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  pathnameIdx: index('analytics_events_pathname_idx').on(table.pathname),
}));
```

**Step 2: Commit**

```bash
git add workers/src/db/schema.ts
git commit -m "feat: add analyticsEvents table to Drizzle schema"
```

### Task 3: Create event ingestion endpoint

**Files:**
- Create: `workers/src/routes/analytics.ts`
- Modify: `workers/src/index.ts` (add import and route mount)

**Step 1: Create the analytics route file**

Create `workers/src/routes/analytics.ts`:

```typescript
import { Hono } from 'hono';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import {
  analyticsEvents,
  orders,
  orderItems,
  products,
  campaigns,
  campaignEvents,
  subscribers,
  blogPosts,
  customerUsers,
  learnItems,
  enrollments,
  coachingPackages,
} from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const analyticsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── PUBLIC: Event Ingestion (no auth) ─────────────────────

interface TrackingEvent {
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  session_id: string;
  referrer?: string;
  pathname: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

analyticsRoutes.post('/events', async (c) => {
  const db = c.get('db');

  let body: { events: TrackingEvent[] } | TrackingEvent;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  // Accept single event or batch
  const events: TrackingEvent[] = Array.isArray((body as any).events)
    ? (body as any).events
    : [body as TrackingEvent];

  // Validate and limit batch size
  if (events.length > 50) {
    return c.json({ error: 'Max 50 events per batch' }, 400);
  }

  const validTypes = ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'blog_read', 'search'];

  const rows = events
    .filter((e) => e.session_id && e.pathname && validTypes.includes(e.event_type))
    .map((e) => ({
      id: crypto.randomUUID(),
      eventType: e.event_type as any,
      entityType: e.entity_type || null,
      entityId: e.entity_id || null,
      sessionId: e.session_id,
      referrer: e.referrer || null,
      pathname: e.pathname,
      metadata: e.metadata || null,
      createdAt: e.timestamp || new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return c.json({ accepted: 0 });
  }

  await db.insert(analyticsEvents).values(rows);

  return c.json({ accepted: rows.length });
});
```

**Step 2: Register the route in `workers/src/index.ts`**

Add import at line ~28 (after other imports):
```typescript
import { analyticsRoutes } from './routes/analytics';
```

Add route mount at line ~107 (before 404 handler):
```typescript
app.route('/api/analytics', analyticsRoutes);
```

**Step 3: Commit**

```bash
git add workers/src/routes/analytics.ts workers/src/index.ts
git commit -m "feat: add analytics event ingestion endpoint"
```

### Task 4: Create frontend event tracker

**Files:**
- Create: `lib/analytics.ts`

**Step 1: Write the tracker module**

Create `lib/analytics.ts`:

```typescript
const ENDPOINT = '/api/analytics/events';
const FLUSH_INTERVAL = 5000;
const MAX_BATCH = 20;

let sessionId: string | null = null;
let queue: Array<Record<string, unknown>> = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem('_a_sid');
    if (stored) {
      sessionId = stored;
      return stored;
    }
  } catch { /* SSR or restricted */ }

  const id = crypto.randomUUID();
  sessionId = id;
  try {
    sessionStorage.setItem('_a_sid', id);
  } catch { /* ignore */ }
  return id;
}

function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  const payload = JSON.stringify({ events: batch });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, payload);
  } else {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL);
}

export function trackEvent(
  eventType: string,
  data?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  queue.push({
    event_type: eventType,
    entity_type: data?.entityType,
    entity_id: data?.entityId,
    session_id: getSessionId(),
    referrer: document.referrer || undefined,
    pathname: window.location.hash.replace('#', '') || '/',
    metadata: data?.metadata,
    timestamp: new Date().toISOString(),
  });

  if (queue.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function trackPageView() {
  trackEvent('page_view');
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
```

**Step 2: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: add lightweight frontend analytics tracker"
```

### Task 5: Integrate tracker into app routes

**Files:**
- Modify: `App.tsx` (add page view tracking on route change)

**Step 1: Add auto-tracking to the public layout**

In `App.tsx`, import the tracker and add a component that tracks on route change. Add inside the public `<Route path="/" element={<Layout />}>` subtree:

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';

// Component to track page views on route change
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}
```

Then render `<PageTracker />` inside the Router, before the Routes.

**Step 2: Add product_view tracking to ProductDetail page**

In the product detail page, add a call when the product loads:
```typescript
import { trackEvent } from '../lib/analytics';

// Inside useEffect after product loads:
trackEvent('product_view', { entityType: 'product', entityId: product.id });
```

**Step 3: Add blog_read tracking to BlogPostDetail page**

Same pattern for blog posts:
```typescript
trackEvent('blog_read', { entityType: 'blog_post', entityId: post.id });
```

**Step 4: Add add_to_cart tracking to cart actions**

In the CartContext or wherever addToCart is called:
```typescript
trackEvent('add_to_cart', {
  entityType: 'product',
  entityId: productId,
  metadata: { quantity },
});
```

**Step 5: Add checkout_start tracking**

In the Checkout page on mount:
```typescript
trackEvent('checkout_start', { metadata: { itemCount: cart.length } });
```

**Step 6: Commit**

```bash
git add App.tsx pages/ProductDetail.tsx pages/BlogPostDetail.tsx context/CartContext.tsx pages/Checkout.tsx lib/analytics.ts
git commit -m "feat: integrate analytics tracking across frontend"
```

---

## Phase 2: Analytics API Endpoints

### Task 6: Analytics overview endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the overview endpoint**

Append to `workers/src/routes/analytics.ts`:

```typescript
// ─── ADMIN: Analytics Overview ─────────────────────────────

analyticsRoutes.get('/overview', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 30 * 86400000).toISOString();

  // Calculate previous period for comparison
  const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  const prevStart = new Date(new Date(startDate).getTime() - periodMs).toISOString();
  const prevEnd = startDate;

  const [
    revenueCurrent,
    revenuePrev,
    ordersCurrent,
    ordersPrev,
    visitorsCurrent,
    visitorsPrev,
    emailsCurrent,
    emailsPrev,
    revenueTimeSeries,
    topProducts,
    topPosts,
    emailOverview,
    subscriberStats,
  ] = await Promise.all([
    // Revenue current period
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)` })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Revenue previous period
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)` })
      .from(orders)
      .where(and(
        gte(orders.createdAt, prevStart),
        lte(orders.createdAt, prevEnd),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Orders current
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
      .get(),

    // Orders previous
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, prevStart), lte(orders.createdAt, prevEnd)))
      .get(),

    // Unique visitors current (distinct sessions)
    db.select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .get(),

    // Unique visitors previous
    db.select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, prevStart),
        lte(analyticsEvents.createdAt, prevEnd),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .get(),

    // Emails sent current
    db.select({
      count: sql<number>`COALESCE(SUM(${campaigns.recipientCount}), 0)`,
    })
      .from(campaigns)
      .where(and(
        gte(campaigns.sentAt, startDate),
        lte(campaigns.sentAt, endDate),
        eq(campaigns.status, 'sent'),
      ))
      .get(),

    // Emails sent previous
    db.select({
      count: sql<number>`COALESCE(SUM(${campaigns.recipientCount}), 0)`,
    })
      .from(campaigns)
      .where(and(
        gte(campaigns.sentAt, prevStart),
        lte(campaigns.sentAt, prevEnd),
        eq(campaigns.status, 'sent'),
      ))
      .get(),

    // Revenue time series (daily)
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .all(),

    // Top 5 products by revenue
    db.select({
      id: products.id,
      name: products.name,
      revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.price} AS REAL) * ${orderItems.quantity}), 0)`,
      unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(products.id, products.name)
      .orderBy(sql`3 DESC`)
      .limit(5)
      .all(),

    // Top 5 blog posts by views
    db.select({
      entityId: analyticsEvents.entityId,
      views: sql<number>`count(*)`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'blog_read'),
      ))
      .groupBy(analyticsEvents.entityId)
      .orderBy(sql`2 DESC`)
      .limit(5)
      .all(),

    // Email open/click rates
    db.select({
      opens: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'opened' THEN 1 ELSE 0 END), 0)`,
      clicks: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'clicked' THEN 1 ELSE 0 END), 0)`,
      delivered: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'delivered' THEN 1 ELSE 0 END), 0)`,
    })
      .from(campaignEvents)
      .where(and(
        gte(campaignEvents.createdAt, startDate),
        lte(campaignEvents.createdAt, endDate),
      ))
      .get(),

    // Subscriber stats
    db.select({
      total: sql<number>`count(*)`,
      newCount: sql<number>`SUM(CASE WHEN ${subscribers.subscribedAt} >= ${startDate} THEN 1 ELSE 0 END)`,
    })
      .from(subscribers)
      .where(eq(subscribers.status, 'active'))
      .get(),
  ]);

  // Resolve blog post titles for top posts
  const topPostIds = topPosts.map((p) => p.entityId).filter(Boolean);
  let postTitles: Record<string, string> = {};
  if (topPostIds.length > 0) {
    const posts = await db.select({ id: blogPosts.id, title: blogPosts.title })
      .from(blogPosts)
      .where(sql`${blogPosts.id} IN (${sql.join(topPostIds.map(id => sql`${id}`), sql`, `)})`)
      .all();
    postTitles = Object.fromEntries(posts.map((p) => [p.id, p.title]));
  }

  // Calculate conversion rate (add_to_cart sessions that became orders... simplified)
  const conversionData = await db.select({
    cartSessions: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventType} = 'add_to_cart' THEN ${analyticsEvents.sessionId} END)`,
    checkoutSessions: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventType} = 'checkout_start' THEN ${analyticsEvents.sessionId} END)`,
  })
    .from(analyticsEvents)
    .where(and(
      gte(analyticsEvents.createdAt, startDate),
      lte(analyticsEvents.createdAt, endDate),
    ))
    .get();

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10;

  const delivered = emailOverview?.delivered ?? 0;
  const openRate = delivered > 0 ? Math.round(((emailOverview?.opens ?? 0) / delivered) * 1000) / 10 : 0;
  const clickRate = delivered > 0 ? Math.round(((emailOverview?.clicks ?? 0) / delivered) * 1000) / 10 : 0;
  const convRate = (conversionData?.cartSessions ?? 0) > 0
    ? Math.round(((conversionData?.checkoutSessions ?? 0) / (conversionData?.cartSessions ?? 1)) * 1000) / 10
    : 0;

  return c.json({
    kpis: {
      revenue: { value: revenueCurrent?.total ?? 0, change: pctChange(revenueCurrent?.total ?? 0, revenuePrev?.total ?? 0) },
      orders: { value: ordersCurrent?.count ?? 0, change: pctChange(ordersCurrent?.count ?? 0, ordersPrev?.count ?? 0) },
      visitors: { value: visitorsCurrent?.count ?? 0, change: pctChange(visitorsCurrent?.count ?? 0, visitorsPrev?.count ?? 0) },
      emailsSent: { value: emailsCurrent?.count ?? 0, change: pctChange(emailsCurrent?.count ?? 0, emailsPrev?.count ?? 0) },
      conversionRate: { value: convRate, change: 0 },
      openRate: { value: openRate },
      clickRate: { value: clickRate },
    },
    revenueTimeSeries: revenueTimeSeries,
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
    })),
    topPosts: topPosts.map((p) => ({
      id: p.entityId,
      title: postTitles[p.entityId!] || 'Unknown Post',
      views: p.views,
    })),
    subscribers: {
      total: subscriberStats?.total ?? 0,
      newCount: subscriberStats?.newCount ?? 0,
    },
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add analytics overview API endpoint"
```

### Task 7: Revenue deep-dive endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the revenue endpoint**

Append to `workers/src/routes/analytics.ts`:

```typescript
// ─── ADMIN: Revenue & Products Analytics ───────────────────

analyticsRoutes.get('/revenue', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    revenueTrend,
    ordersByStatus,
    revenueByType,
    productLeaderboard,
    aovTrend,
    lowStock,
  ] = await Promise.all([
    // Daily revenue trend
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
      orderCount: sql<number>`count(*)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`)
      .all(),

    // Orders by status
    db.select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
      .groupBy(orders.status)
      .all(),

    // Revenue by product type
    db.select({
      productType: products.productType,
      revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.price} AS REAL) * ${orderItems.quantity}), 0)`,
    })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(products.productType)
      .all(),

    // Product leaderboard (top 20)
    db.select({
      id: products.id,
      name: products.name,
      productType: products.productType,
      unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.price} AS REAL) * ${orderItems.quantity}), 0)`,
      avgRating: products.rating,
    })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(products.id, products.name, products.productType, products.rating)
      .orderBy(sql`5 DESC`)
      .limit(20)
      .all(),

    // Average order value trend
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      aov: sql<number>`COALESCE(AVG(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`)
      .all(),

    // Low stock products (stock < 5)
    db.select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      productType: products.productType,
    })
      .from(products)
      .where(and(
        sql`CAST(${products.stock} AS INTEGER) < 5`,
        eq(products.status, 'active'),
      ))
      .orderBy(products.stock)
      .limit(10)
      .all(),
  ]);

  return c.json({
    revenueTrend,
    ordersByStatus,
    revenueByType,
    productLeaderboard,
    aovTrend,
    lowStock,
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add revenue analytics API endpoint"
```

### Task 8: Email analytics endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the email endpoint**

```typescript
// ─── ADMIN: Email & Marketing Analytics ────────────────────

analyticsRoutes.get('/email', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    campaignPerformance,
    subscriberGrowth,
    engagementDistribution,
    automationStats,
  ] = await Promise.all([
    // Campaign performance table
    db.select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      sentAt: campaigns.sentAt,
      recipientCount: campaigns.recipientCount,
      delivered: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'delivered' THEN 1 ELSE 0 END), 0)`,
      opens: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'opened' THEN 1 ELSE 0 END), 0)`,
      clicks: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'clicked' THEN 1 ELSE 0 END), 0)`,
      bounces: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'bounced' THEN 1 ELSE 0 END), 0)`,
      unsubscribes: sql<number>`COALESCE(SUM(CASE WHEN ${campaignEvents.eventType} = 'unsubscribed' THEN 1 ELSE 0 END), 0)`,
    })
      .from(campaigns)
      .leftJoin(campaignEvents, eq(campaigns.id, campaignEvents.campaignId))
      .where(and(
        gte(campaigns.sentAt, startDate),
        lte(campaigns.sentAt, endDate),
      ))
      .groupBy(campaigns.id, campaigns.name, campaigns.status, campaigns.sentAt, campaigns.recipientCount)
      .orderBy(desc(campaigns.sentAt))
      .all(),

    // Subscriber growth (daily new vs unsubscribed)
    db.select({
      date: sql<string>`DATE(${subscribers.subscribedAt})`,
      newSubs: sql<number>`count(*)`,
    })
      .from(subscribers)
      .where(and(
        gte(subscribers.subscribedAt, startDate),
        lte(subscribers.subscribedAt, endDate),
      ))
      .groupBy(sql`DATE(${subscribers.subscribedAt})`)
      .orderBy(sql`DATE(${subscribers.subscribedAt})`)
      .all(),

    // Engagement level distribution
    db.select({
      level: subscribers.engagementLevel,
      count: sql<number>`count(*)`,
    })
      .from(subscribers)
      .where(eq(subscribers.status, 'active'))
      .groupBy(subscribers.engagementLevel)
      .all(),

    // Automation stats
    db.select({
      id: sql<string>`id`,
      name: sql<string>`name`,
      status: sql<string>`status`,
      totalTriggered: sql<number>`COALESCE(total_triggered, 0)`,
      totalSent: sql<number>`COALESCE(total_sent, 0)`,
    })
      .from(sql`email_automations`)
      .all()
      .catch(() => []),
  ]);

  return c.json({
    campaignPerformance,
    subscriberGrowth,
    engagementDistribution,
    automationStats,
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add email analytics API endpoint"
```

### Task 9: Content analytics endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the content endpoint**

```typescript
// ─── ADMIN: Content & Traffic Analytics ────────────────────

analyticsRoutes.get('/content', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    blogPerformance,
    viewsTrend,
    trafficSources,
    topPages,
  ] = await Promise.all([
    // Blog post performance
    db.select({
      entityId: analyticsEvents.entityId,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'blog_read'),
      ))
      .groupBy(analyticsEvents.entityId)
      .orderBy(sql`2 DESC`)
      .limit(20)
      .all(),

    // Page views trend (daily)
    db.select({
      date: sql<string>`DATE(${analyticsEvents.createdAt})`,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
      .orderBy(sql`DATE(${analyticsEvents.createdAt})`)
      .all(),

    // Traffic sources (referrer breakdown)
    db.select({
      referrer: sql<string>`COALESCE(${analyticsEvents.referrer}, 'Direct')`,
      count: sql<number>`count(*)`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .groupBy(analyticsEvents.referrer)
      .orderBy(sql`2 DESC`)
      .limit(10)
      .all(),

    // Top pages by views
    db.select({
      pathname: analyticsEvents.pathname,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .groupBy(analyticsEvents.pathname)
      .orderBy(sql`2 DESC`)
      .limit(15)
      .all(),
  ]);

  // Resolve blog post titles
  const postIds = blogPerformance.map((p) => p.entityId).filter(Boolean);
  let postTitles: Record<string, { title: string; publishedAt: string | null }> = {};
  if (postIds.length > 0) {
    const posts = await db.select({ id: blogPosts.id, title: blogPosts.title, publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(sql`${blogPosts.id} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
      .all();
    postTitles = Object.fromEntries(posts.map((p) => [p.id, { title: p.title, publishedAt: p.publishedAt }]));
  }

  return c.json({
    blogPerformance: blogPerformance.map((p) => ({
      id: p.entityId,
      title: postTitles[p.entityId!]?.title || 'Unknown',
      publishedAt: postTitles[p.entityId!]?.publishedAt || null,
      views: p.views,
      uniqueVisitors: p.uniqueVisitors,
    })),
    viewsTrend,
    trafficSources,
    topPages,
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add content analytics API endpoint"
```

### Task 10: Customer analytics endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the customer endpoint**

```typescript
// ─── ADMIN: Customer Analytics ─────────────────────────────

analyticsRoutes.get('/customers', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 90 * 86400000).toISOString();

  const [
    newVsReturning,
    topCustomers,
    avgOrdersPerCustomer,
    customerGrowth,
    cohortData,
  ] = await Promise.all([
    // New vs returning (customers with 1 order vs 2+)
    db.select({
      orderCount: sql<number>`count(*)`,
      customerCount: sql<number>`count(DISTINCT ${orders.customerEmail})`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Top 10 customers by spend
    db.select({
      email: orders.customerEmail,
      name: orders.customerName,
      totalSpend: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
      orderCount: sql<number>`count(*)`,
    })
      .from(orders)
      .where(eq(orders.status, 'confirmed'))
      .groupBy(orders.customerEmail, orders.customerName)
      .orderBy(sql`3 DESC`)
      .limit(10)
      .all(),

    // Average orders per customer
    db.select({
      avgOrders: sql<number>`CAST(count(*) AS REAL) / MAX(1, COUNT(DISTINCT ${orders.customerEmail}))`,
      avgOrderValue: sql<number>`COALESCE(AVG(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Customer registration growth (daily)
    db.select({
      date: sql<string>`DATE(${customerUsers.createdAt})`,
      count: sql<number>`count(*)`,
    })
      .from(customerUsers)
      .where(and(
        gte(customerUsers.createdAt, startDate),
        lte(customerUsers.createdAt, endDate),
      ))
      .groupBy(sql`DATE(${customerUsers.createdAt})`)
      .orderBy(sql`DATE(${customerUsers.createdAt})`)
      .all(),

    // Monthly cohort data (simplified: acquisition month → orders in subsequent months)
    db.select({
      cohortMonth: sql<string>`SUBSTR(${orders.customerEmail}, 1, 0) || SUBSTR(MIN(${orders.createdAt}), 1, 7)`,
      orderMonth: sql<string>`SUBSTR(${orders.createdAt}, 1, 7)`,
      customers: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
    })
      .from(orders)
      .where(eq(orders.status, 'confirmed'))
      .groupBy(sql`SUBSTR(${orders.createdAt}, 1, 7)`)
      .orderBy(sql`2`)
      .all()
      .catch(() => []),
  ]);

  return c.json({
    overview: {
      totalCustomers: newVsReturning?.customerCount ?? 0,
      totalOrders: newVsReturning?.orderCount ?? 0,
      avgOrders: avgOrdersPerCustomer?.avgOrders ?? 0,
      avgOrderValue: avgOrdersPerCustomer?.avgOrderValue ?? 0,
    },
    topCustomers,
    customerGrowth,
    cohortData,
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add customer analytics API endpoint"
```

### Task 11: Services analytics endpoint

**Files:**
- Modify: `workers/src/routes/analytics.ts`

**Step 1: Add the services endpoint**

```typescript
// ─── ADMIN: Services (Learn + Coaching) Analytics ──────────

analyticsRoutes.get('/services', adminAuth, async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const now = new Date();
  const endDate = to || now.toISOString();
  const startDate = from || new Date(now.getTime() - 90 * 86400000).toISOString();

  const [
    workshopPerformance,
    enrollmentTrend,
    coachingPerformance,
    enrollmentsByStatus,
  ] = await Promise.all([
    // Workshop performance
    db.select({
      id: learnItems.id,
      title: learnItems.title,
      enrolledCount: learnItems.enrolledCount,
      price: learnItems.price,
      format: learnItems.format,
      status: learnItems.status,
    })
      .from(learnItems)
      .orderBy(desc(learnItems.enrolledCount))
      .all(),

    // Enrollment trend
    db.select({
      date: sql<string>`DATE(${enrollments.enrolledAt})`,
      count: sql<number>`count(*)`,
    })
      .from(enrollments)
      .where(and(
        gte(enrollments.enrolledAt, startDate),
        lte(enrollments.enrolledAt, endDate),
      ))
      .groupBy(sql`DATE(${enrollments.enrolledAt})`)
      .orderBy(sql`DATE(${enrollments.enrolledAt})`)
      .all(),

    // Coaching packages performance
    db.select({
      id: coachingPackages.id,
      title: coachingPackages.title,
      price: coachingPackages.price,
      description: coachingPackages.description,
    })
      .from(coachingPackages)
      .where(eq(coachingPackages.isActive, true))
      .orderBy(coachingPackages.displayOrder)
      .all(),

    // Enrollments by status
    db.select({
      status: enrollments.status,
      count: sql<number>`count(*)`,
    })
      .from(enrollments)
      .groupBy(enrollments.status)
      .all(),
  ]);

  return c.json({
    workshops: workshopPerformance,
    enrollmentTrend,
    coaching: coachingPerformance,
    enrollmentsByStatus,
  });
});
```

**Step 2: Commit**

```bash
git add workers/src/routes/analytics.ts
git commit -m "feat: add services analytics API endpoint"
```

---

## Phase 3: Admin Frontend Pages

### Task 12: Create Analytics Hub page

**Files:**
- Create: `admin/pages/AnalyticsHub.tsx`

**Step 1: Build the Analytics Hub page**

Create `admin/pages/AnalyticsHub.tsx` with:
- Date range picker component (preset buttons: 7d, 30d, 90d + custom)
- KPI cards row (Revenue, Orders, Visitors, Emails, Conversion) with sparklines and % change badges
- Revenue & Orders area chart (Recharts AreaChart)
- 2-column grid: Top Products table + Top Blog Posts table
- 2-column grid: Email Performance summary card + Customer Insights summary card
- Each summary section has "View all →" link to deep-dive page
- Loading skeleton state
- Error state with retry
- Uses `API_BASE` from `../config/api`
- Uses `useAuth()` for token
- Follow exact styling from Dashboard.tsx (stone color palette, card borders, spacing)

Key UI components to include in the file:
- `DateRangePicker` — inline component with preset buttons styled as pills
- `KpiCard` — reusable card with value, change %, icon, sparkline
- `MiniSparkline` — tiny Recharts AreaChart (48px height, no axes)
- `LeaderboardTable` — ranked list with position number, name, metric value

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsHub.tsx
git commit -m "feat: add Analytics Hub admin page"
```

### Task 13: Create Revenue Analytics page

**Files:**
- Create: `admin/pages/AnalyticsRevenue.tsx`

**Step 1: Build the Revenue deep-dive page**

Create `admin/pages/AnalyticsRevenue.tsx` with:
- Back link to Analytics Hub
- Date range picker (shared pattern from Hub)
- Revenue over time AreaChart (daily granularity)
- AOV trend line chart
- Orders by status — horizontal stacked BarChart or donut (Recharts PieChart)
- Revenue by product type — donut chart
- Product leaderboard — sortable table with columns: Rank, Product, Type, Units Sold, Revenue, Rating
- Low stock alerts — warning cards for products with stock < 5

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsRevenue.tsx
git commit -m "feat: add Revenue Analytics admin page"
```

### Task 14: Create Email Analytics page

**Files:**
- Create: `admin/pages/AnalyticsEmail.tsx`

**Step 1: Build the Email deep-dive page**

Create `admin/pages/AnalyticsEmail.tsx` with:
- Back link to Analytics Hub
- Date range picker
- Campaign performance table — sortable columns: Name, Sent, Open Rate, Click Rate, Bounce Rate, Unsub Rate, Date
- Open rate and click rate calculated per row
- Subscriber growth AreaChart (new subscribers over time)
- Engagement distribution — donut chart (PieChart) with engagement levels
- Automation stats table — Name, Status, Triggers, Sent, Success Rate

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsEmail.tsx
git commit -m "feat: add Email Analytics admin page"
```

### Task 15: Create Content Analytics page

**Files:**
- Create: `admin/pages/AnalyticsContent.tsx`

**Step 1: Build the Content deep-dive page**

Create `admin/pages/AnalyticsContent.tsx` with:
- Back link to Analytics Hub
- Date range picker
- Page views trend AreaChart (views + unique visitors)
- Blog performance table — Title, Views, Unique Visitors, Published Date (sortable)
- Traffic sources — horizontal BarChart showing top referrers
- Top pages table — Pathname, Views, Unique Visitors

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsContent.tsx
git commit -m "feat: add Content Analytics admin page"
```

### Task 16: Create Customer Analytics page

**Files:**
- Create: `admin/pages/AnalyticsCustomers.tsx`

**Step 1: Build the Customer deep-dive page**

Create `admin/pages/AnalyticsCustomers.tsx` with:
- Back link to Analytics Hub
- Date range picker (default 90d for customers)
- Overview cards: Total Customers, Avg Orders Per Customer, AOV
- Customer growth AreaChart
- Top customers table — Email (masked partially for privacy), Name, Total Spend, Orders
- Cohort retention heatmap — monthly grid using CSS background colors (muted stone/emerald scale)

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsCustomers.tsx
git commit -m "feat: add Customer Analytics admin page"
```

### Task 17: Create Services Analytics page

**Files:**
- Create: `admin/pages/AnalyticsServices.tsx`

**Step 1: Build the Services deep-dive page**

Create `admin/pages/AnalyticsServices.tsx` with:
- Back link to Analytics Hub
- Two main sections with section headers: "Workshops" and "Coaching"
- Enrollment trend AreaChart
- Workshop leaderboard — Title, Enrolled, Price, Format, Status (sortable)
- Enrollments by status — donut chart
- Coaching packages — card grid with title, price, description

**Step 2: Commit**

```bash
git add admin/pages/AnalyticsServices.tsx
git commit -m "feat: add Services Analytics admin page"
```

---

## Phase 4: Navigation & Routing

### Task 18: Add routes and navigation

**Files:**
- Modify: `App.tsx` (add route entries + imports)
- Modify: `admin/AdminLayout.tsx` (add nav item)

**Step 1: Add imports to App.tsx**

```typescript
import AnalyticsHub from './admin/pages/AnalyticsHub';
import AnalyticsRevenue from './admin/pages/AnalyticsRevenue';
import AnalyticsEmail from './admin/pages/AnalyticsEmail';
import AnalyticsContent from './admin/pages/AnalyticsContent';
import AnalyticsCustomers from './admin/pages/AnalyticsCustomers';
import AnalyticsServices from './admin/pages/AnalyticsServices';
```

**Step 2: Add routes inside the admin Route block (after `<Route index element={<Dashboard />} />`)**

```typescript
<Route path="analytics" element={<AnalyticsHub />} />
<Route path="analytics/revenue" element={<AnalyticsRevenue />} />
<Route path="analytics/email" element={<AnalyticsEmail />} />
<Route path="analytics/content" element={<AnalyticsContent />} />
<Route path="analytics/customers" element={<AnalyticsCustomers />} />
<Route path="analytics/services" element={<AnalyticsServices />} />
```

**Step 3: Add nav item to AdminLayout.tsx**

Import `BarChart3` from lucide-react. Add a new nav section after the Dashboard item:

```typescript
{
  items: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ],
},
```

**Step 4: Commit**

```bash
git add App.tsx admin/AdminLayout.tsx
git commit -m "feat: add analytics routes and navigation"
```

---

## Phase 5: Polish & Testing

### Task 19: Manual testing checklist

1. Start workers dev server: `cd workers && npm run dev`
2. Apply migration: `cd workers && npx wrangler d1 migrations apply lyne-tilt-db --local`
3. Start frontend: `npm run dev`
4. Browse the public site — verify page_view events are being sent (check Network tab for `/api/analytics/events`)
5. Visit a product page — verify product_view event fires
6. Visit a blog post — verify blog_read event fires
7. Add item to cart — verify add_to_cart event fires
8. Go to `/admin/analytics` — verify hub loads with KPI cards
9. Click each "View all →" link — verify each deep-dive page loads
10. Test date range picker — verify charts update
11. Check all tables sort correctly
12. Test loading states and error states
13. Verify mobile responsiveness of analytics pages

### Task 20: Apply migration to production

**Step 1: Apply migration remotely**

Run: `cd workers && npx wrangler d1 migrations apply lyne-tilt-db --remote`

**Step 2: Deploy workers**

Run: `cd workers && npm run deploy`

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "feat: analytics suite complete"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1: Infrastructure | 1-5 | D1 migration, schema, event ingestion, frontend tracker |
| 2: API Endpoints | 6-11 | Overview, revenue, email, content, customer, services endpoints |
| 3: Frontend Pages | 12-17 | Hub + 5 deep-dive pages |
| 4: Navigation | 18 | Routes + sidebar nav |
| 5: Polish | 19-20 | Testing + production deploy |

**Total: 20 tasks across 5 phases.**
