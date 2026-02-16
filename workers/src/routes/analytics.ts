import { Hono } from 'hono';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import {
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
  coachingBookings,
  analyticsEvents,
  emailAutomations,
} from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const analyticsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Allowed event types ──────────────────────────────────
const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'blog_read',
  'search',
]);

const MAX_BATCH_SIZE = 50;

// ─── POST /events — Public event ingestion ────────────────
analyticsRoutes.post('/events', async (c) => {
  const db = c.get('db');
  const body = await c.req.json<{
    event_type?: string;
    entity_type?: string;
    entity_id?: string;
    session_id?: string;
    referrer?: string;
    pathname?: string;
    metadata?: Record<string, unknown>;
    events?: Array<{
      event_type?: string;
      entity_type?: string;
      entity_id?: string;
      session_id?: string;
      referrer?: string;
      pathname?: string;
      metadata?: Record<string, unknown>;
    }>;
  }>();

  // Normalise: single event or batch
  const rawEvents = body.events ?? [body];

  if (rawEvents.length > MAX_BATCH_SIZE) {
    return c.json({ error: `Batch limited to ${MAX_BATCH_SIZE} events` }, 400);
  }

  type EventType = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'blog_read' | 'search';

  // Validate and build insert rows
  const rows: Array<{
    id: string;
    eventType: EventType;
    entityType: string | null;
    entityId: string | null;
    sessionId: string;
    referrer: string | null;
    pathname: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }> = [];

  for (const evt of rawEvents) {
    if (!evt.event_type || !ALLOWED_EVENT_TYPES.has(evt.event_type)) continue;
    if (!evt.session_id || !evt.pathname) continue;

    rows.push({
      id: crypto.randomUUID(),
      eventType: evt.event_type as EventType,
      entityType: evt.entity_type ?? null,
      entityId: evt.entity_id ?? null,
      sessionId: evt.session_id,
      referrer: evt.referrer ?? null,
      pathname: evt.pathname,
      metadata: evt.metadata ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    await db.insert(analyticsEvents).values(rows);
  }

  return c.json({ accepted: rows.length });
});

// ─── Helpers ───────────────────────────────────────────────

/** Parse ?from=&to= query params, defaulting to last N days */
function parseDateRange(c: { req: { query: (k: string) => string | undefined } }, defaultDays = 30) {
  const now = new Date();
  const toParam = c.req.query('to');
  const fromParam = c.req.query('from');

  const to = toParam ? new Date(toParam + 'T23:59:59.999Z') : now;
  const from = fromParam
    ? new Date(fromParam + 'T00:00:00.000Z')
    : new Date(new Date(to).setDate(to.getDate() - defaultDays));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    fromDate: from,
    toDate: to,
  };
}

/** Calculate the previous period of the same length for comparison */
function previousPeriod(fromDate: Date, toDate: Date) {
  const lengthMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime());
  const prevFrom = new Date(fromDate.getTime() - lengthMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

/** Percentage change, null-safe */
function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/** Generate date strings between two dates (inclusive) */
function dateRange(fromDate: Date, toDate: Date): string[] {
  const dates: string[] = [];
  const d = new Date(fromDate);
  d.setUTCHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setUTCHours(0, 0, 0, 0);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Fill missing days with a default value */
function fillDays<T extends Record<string, unknown>>(
  rows: T[],
  dateKey: string,
  days: string[],
  defaults: Omit<T, typeof dateKey>,
): T[] {
  const map = new Map(rows.map(r => [r[dateKey] as string, r]));
  return days.map(d => (map.get(d) ?? { ...defaults, [dateKey]: d }) as T);
}

/** Mask email for privacy: j***@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

// ─── Task 6: GET /overview — Analytics Hub ────────────────

analyticsRoutes.get('/overview', adminAuth, async (c) => {
  const db = c.get('db');
  const { from, to, fromDate, toDate } = parseDateRange(c);
  const prev = previousPeriod(fromDate, toDate);
  const days = dateRange(fromDate, toDate);

  // ── KPIs: current period ──────────────────────────────
  const [
    revenueCurr,
    ordersCurr,
    visitorsCurr,
    emailsSentCurr,
    cartSessions,
    checkoutSessions,
    opensCurr,
    clicksCurr,
    deliveredCurr,
    // Previous period
    revenuePrev,
    ordersPrev,
    visitorsPrev,
    emailsSentPrev,
  ] = await Promise.all([
    // Revenue (confirmed orders)
    db.select({ value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), eq(orders.status, 'confirmed')))
      .get(),
    // Order count
    db.select({ value: sql<number>`count(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .get(),
    // Unique visitors (distinct sessions)
    db.select({ value: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.createdAt, from), lte(analyticsEvents.createdAt, to)))
      .get(),
    // Emails sent (campaign recipientCount for sent campaigns)
    db.select({ value: sql<number>`COALESCE(SUM(${campaigns.recipientCount}), 0)` })
      .from(campaigns)
      .where(and(
        gte(campaigns.sentAt, from),
        lte(campaigns.sentAt, to),
        eq(campaigns.status, 'sent'),
      ))
      .get(),
    // Cart sessions (distinct sessions with add_to_cart)
    db.select({ value: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
        eq(analyticsEvents.eventType, 'add_to_cart'),
      ))
      .get(),
    // Checkout sessions (distinct sessions with checkout_start)
    db.select({ value: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
        eq(analyticsEvents.eventType, 'checkout_start'),
      ))
      .get(),
    // Campaign opens
    db.select({ value: sql<number>`count(*)` })
      .from(campaignEvents)
      .where(and(
        gte(campaignEvents.createdAt, from),
        lte(campaignEvents.createdAt, to),
        eq(campaignEvents.eventType, 'opened'),
      ))
      .get(),
    // Campaign clicks
    db.select({ value: sql<number>`count(*)` })
      .from(campaignEvents)
      .where(and(
        gte(campaignEvents.createdAt, from),
        lte(campaignEvents.createdAt, to),
        eq(campaignEvents.eventType, 'clicked'),
      ))
      .get(),
    // Campaign delivered
    db.select({ value: sql<number>`count(*)` })
      .from(campaignEvents)
      .where(and(
        gte(campaignEvents.createdAt, from),
        lte(campaignEvents.createdAt, to),
        eq(campaignEvents.eventType, 'delivered'),
      ))
      .get(),
    // ── Previous period comparisons ──
    db.select({ value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to), eq(orders.status, 'confirmed')))
      .get(),
    db.select({ value: sql<number>`count(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))
      .get(),
    db.select({ value: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})` })
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.createdAt, prev.from), lte(analyticsEvents.createdAt, prev.to)))
      .get(),
    db.select({ value: sql<number>`COALESCE(SUM(${campaigns.recipientCount}), 0)` })
      .from(campaigns)
      .where(and(
        gte(campaigns.sentAt, prev.from),
        lte(campaigns.sentAt, prev.to),
        eq(campaigns.status, 'sent'),
      ))
      .get(),
  ]);

  const cart = cartSessions?.value ?? 0;
  const checkout = checkoutSessions?.value ?? 0;
  const delivered = deliveredCurr?.value ?? 0;
  const opens = opensCurr?.value ?? 0;
  const clicks = clicksCurr?.value ?? 0;

  // AOV = revenue / orders (current and previous)
  const aovCurr = (ordersCurr?.value ?? 0) > 0
    ? (revenueCurr?.value ?? 0) / (ordersCurr?.value ?? 0)
    : 0;
  const aovPrev = (ordersPrev?.value ?? 0) > 0
    ? (revenuePrev?.value ?? 0) / (ordersPrev?.value ?? 0)
    : 0;

  // ── Revenue time series ───────────────────────────────
  const revDaily = await db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
  })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), eq(orders.status, 'confirmed')))
    .groupBy(sql`DATE(${orders.createdAt})`)
    .all();

  // ── Top 5 products by revenue ─────────────────────────
  const topProducts = await db.select({
    id: products.id,
    name: products.name,
    revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.price} AS REAL) * ${orderItems.quantity}), 0)`,
    unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
  })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
    .groupBy(products.id, products.name)
    .orderBy(sql`3 DESC`)
    .limit(5)
    .all();

  // ── Top 5 blog posts by views ─────────────────────────
  const topPostEvents = await db.select({
    entityId: analyticsEvents.entityId,
    views: sql<number>`count(*)`,
  })
    .from(analyticsEvents)
    .where(and(
      gte(analyticsEvents.createdAt, from),
      lte(analyticsEvents.createdAt, to),
      eq(analyticsEvents.eventType, 'blog_read'),
    ))
    .groupBy(analyticsEvents.entityId)
    .orderBy(sql`2 DESC`)
    .limit(5)
    .all();

  // Resolve post titles
  let topPosts: { id: string; title: string; views: number }[] = [];
  if (topPostEvents.length > 0) {
    const postIds = topPostEvents.map(e => e.entityId).filter(Boolean) as string[];
    if (postIds.length > 0) {
      const posts = await db.select({ id: blogPosts.id, title: blogPosts.title })
        .from(blogPosts)
        .where(sql`${blogPosts.id} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
        .all();
      const postMap = new Map(posts.map(p => [p.id, p.title]));
      topPosts = topPostEvents
        .filter(e => e.entityId && postMap.has(e.entityId))
        .map(e => ({
          id: e.entityId!,
          title: postMap.get(e.entityId!) ?? 'Unknown',
          views: e.views,
        }));
    }
  }

  // ── Subscribers ───────────────────────────────────────
  const [subsTotal, subsNew] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .get(),
    db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(and(
        eq(subscribers.subscribed, true),
        gte(subscribers.subscribedAt, from),
        lte(subscribers.subscribedAt, to),
      ))
      .get(),
  ]);

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

  return c.json({
    kpis: {
      revenue: {
        value: revenueCurr?.value ?? 0,
        change: pctChange(revenueCurr?.value ?? 0, revenuePrev?.value ?? 0),
      },
      orders: {
        value: ordersCurr?.value ?? 0,
        change: pctChange(ordersCurr?.value ?? 0, ordersPrev?.value ?? 0),
      },
      visitors: {
        value: visitorsCurr?.value ?? 0,
        change: pctChange(visitorsCurr?.value ?? 0, visitorsPrev?.value ?? 0),
      },
      emailsSent: {
        value: emailsSentCurr?.value ?? 0,
        change: pctChange(emailsSentCurr?.value ?? 0, emailsSentPrev?.value ?? 0),
      },
      aov: {
        value: aovCurr,
        change: pctChange(aovCurr, aovPrev),
      },
      conversionRate: {
        value: cart > 0 ? (checkout / cart) * 100 : 0,
      },
      openRate: {
        value: delivered > 0 ? (opens / delivered) * 100 : 0,
      },
      clickRate: {
        value: delivered > 0 ? (clicks / delivered) * 100 : 0,
      },
    },
    revenueTimeSeries: fillDays(
      revDaily,
      'date',
      days,
      { value: 0 } as any,
    ),
    topProducts,
    topPosts,
    subscribers: {
      total: subsTotal?.count ?? 0,
      newCount: subsNew?.count ?? 0,
    },
    services: {
      workshopEnrollments: workshopEnrollments?.count ?? 0,
      coachingBookings: coachingBookingsCount?.count ?? 0,
    },
  });
});

// ─── Task 7: GET /revenue — Revenue deep-dive ────────────

analyticsRoutes.get('/revenue', adminAuth, async (c) => {
  const db = c.get('db');
  const { from, to, fromDate, toDate } = parseDateRange(c);
  const days = dateRange(fromDate, toDate);

  const [
    revenueTrendRaw,
    ordersByStatus,
    revenueByType,
    productLeaderboard,
    aovTrendRaw,
    lowStock,
  ] = await Promise.all([
    // Revenue trend by day
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
      orderCount: sql<number>`count(*)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .all(),

    // Orders by status
    db.select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
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
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(products.productType)
      .all(),

    // Product leaderboard (top 20)
    db.select({
      id: products.id,
      name: products.name,
      productType: products.productType,
      unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.price} AS REAL) * ${orderItems.quantity}), 0)`,
      avgRating: sql<number>`COALESCE(${products.rating}, 0)`,
    })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(products.id, products.name, products.productType, products.rating)
      .orderBy(sql`5 DESC`)
      .limit(20)
      .all(),

    // AOV trend by day
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      aov: sql<number>`COALESCE(AVG(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .all(),

    // Low stock: quantity < 5, active products
    db.select({
      id: products.id,
      name: products.name,
      stock: products.quantity,
      productType: products.productType,
    })
      .from(products)
      .where(and(
        eq(products.status, 'active'),
        sql`${products.quantity} < 5`,
        eq(products.trackInventory, true),
      ))
      .orderBy(products.quantity)
      .all(),
  ]);

  return c.json({
    revenueTrend: fillDays(
      revenueTrendRaw,
      'date',
      days,
      { revenue: 0, orderCount: 0 } as any,
    ),
    ordersByStatus,
    revenueByType,
    productLeaderboard,
    aovTrend: fillDays(
      aovTrendRaw,
      'date',
      days,
      { aov: 0 } as any,
    ),
    lowStock,
  });
});

// ─── Task 8: GET /email — Email & Marketing deep-dive ─────

analyticsRoutes.get('/email', adminAuth, async (c) => {
  const db = c.get('db');
  const { from, to, fromDate, toDate } = parseDateRange(c);
  const days = dateRange(fromDate, toDate);

  const [
    campaignPerformance,
    subscriberGrowthRaw,
    engagementDistribution,
    automationStats,
  ] = await Promise.all([
    // Campaign performance with event aggregates
    db.select({
      id: campaigns.id,
      name: campaigns.subject,
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
        gte(campaigns.createdAt, from),
        lte(campaigns.createdAt, to),
      ))
      .groupBy(campaigns.id, campaigns.subject, campaigns.status, campaigns.sentAt, campaigns.recipientCount)
      .orderBy(desc(campaigns.createdAt))
      .all(),

    // Subscriber growth by day
    db.select({
      date: sql<string>`DATE(${subscribers.subscribedAt})`,
      newSubs: sql<number>`count(*)`,
    })
      .from(subscribers)
      .where(and(
        gte(subscribers.subscribedAt, from),
        lte(subscribers.subscribedAt, to),
      ))
      .groupBy(sql`DATE(${subscribers.subscribedAt})`)
      .all(),

    // Engagement level distribution
    db.select({
      level: sql<string>`COALESCE(${subscribers.engagementLevel}, 'new')`,
      count: sql<number>`count(*)`,
    })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .groupBy(subscribers.engagementLevel)
      .all(),

    // Automation stats — use Drizzle table; catch for safety if table missing
    db.select({
      id: emailAutomations.id,
      name: emailAutomations.name,
      status: emailAutomations.status,
      totalTriggered: emailAutomations.totalTriggered,
      totalSent: emailAutomations.totalSent,
    })
      .from(emailAutomations)
      .orderBy(desc(emailAutomations.updatedAt))
      .all()
      .catch(() => []),
  ]);

  return c.json({
    campaignPerformance,
    subscriberGrowth: fillDays(
      subscriberGrowthRaw,
      'date',
      days,
      { newSubs: 0 } as any,
    ),
    engagementDistribution,
    automationStats,
  });
});

// ─── Task 9: GET /content — Content & Traffic deep-dive ───

analyticsRoutes.get('/content', adminAuth, async (c) => {
  const db = c.get('db');
  const { from, to, fromDate, toDate } = parseDateRange(c);
  const days = dateRange(fromDate, toDate);

  const [
    blogEventsRaw,
    viewsTrendRaw,
    trafficSources,
    topPages,
  ] = await Promise.all([
    // Blog post performance: analytics_events where event_type='blog_read'
    db.select({
      entityId: analyticsEvents.entityId,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
        eq(analyticsEvents.eventType, 'blog_read'),
      ))
      .groupBy(analyticsEvents.entityId)
      .orderBy(sql`2 DESC`)
      .all(),

    // Views trend: page_view events by day
    db.select({
      date: sql<string>`DATE(${analyticsEvents.createdAt})`,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
        eq(analyticsEvents.eventType, 'page_view'),
      ))
      .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
      .all(),

    // Traffic sources: group by referrer, top 10
    db.select({
      referrer: sql<string>`COALESCE(${analyticsEvents.referrer}, 'Direct')`,
      count: sql<number>`count(*)`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
      ))
      .groupBy(sql`COALESCE(${analyticsEvents.referrer}, 'Direct')`)
      .orderBy(sql`2 DESC`)
      .limit(10)
      .all(),

    // Top pages: group by pathname, top 15
    db.select({
      pathname: analyticsEvents.pathname,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.createdAt, from),
        lte(analyticsEvents.createdAt, to),
      ))
      .groupBy(analyticsEvents.pathname)
      .orderBy(sql`2 DESC`)
      .limit(15)
      .all(),
  ]);

  // Resolve blog post titles from entityId
  let blogPerformance: { id: string; title: string; publishedAt: string | null; views: number; uniqueVisitors: number }[] = [];
  const blogEntityIds = blogEventsRaw.map(e => e.entityId).filter(Boolean) as string[];
  if (blogEntityIds.length > 0) {
    const posts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      publishedAt: blogPosts.publishedAt,
    })
      .from(blogPosts)
      .where(sql`${blogPosts.id} IN (${sql.join(blogEntityIds.map(id => sql`${id}`), sql`, `)})`)
      .all();
    const postMap = new Map(posts.map(p => [p.id, p]));
    blogPerformance = blogEventsRaw
      .filter(e => e.entityId && postMap.has(e.entityId))
      .map(e => ({
        id: e.entityId!,
        title: postMap.get(e.entityId!)!.title,
        publishedAt: postMap.get(e.entityId!)!.publishedAt,
        views: e.views,
        uniqueVisitors: e.uniqueVisitors,
      }));
  }

  return c.json({
    blogPerformance,
    viewsTrend: fillDays(
      viewsTrendRaw,
      'date',
      days,
      { views: 0, uniqueVisitors: 0 } as any,
    ),
    trafficSources,
    topPages,
  });
});

// ─── Task 10: GET /customers — Customer deep-dive ─────────

analyticsRoutes.get('/customers', adminAuth, async (c) => {
  const db = c.get('db');
  // Default to 90 days for customer analytics
  const { from, to } = parseDateRange(c, 90);

  const [
    totalCustomers,
    totalOrders,
    avgOrderValue,
    topCustomersRaw,
    customerGrowthRaw,
  ] = await Promise.all([
    // Total customers
    db.select({ count: sql<number>`count(*)` })
      .from(customerUsers)
      .get(),

    // Total confirmed orders in period
    db.select({
      count: sql<number>`count(*)`,
      totalSpend: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Average order value (confirmed orders)
    db.select({
      aov: sql<number>`COALESCE(AVG(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
        eq(orders.status, 'confirmed'),
      ))
      .get(),

    // Top 10 customers by spend (confirmed orders)
    db.select({
      email: sql<string>`COALESCE(${orders.shippingFirstName} || ' <' || ${orders.shippingLastName} || '>', 'Unknown')`,
      name: sql<string>`COALESCE(${orders.shippingFirstName} || ' ' || ${orders.shippingLastName}, 'Unknown')`,
      rawEmail: sql<string>`COALESCE(
        (SELECT cu.email FROM customer_users cu WHERE cu.id = ${orders.userId}),
        'unknown@unknown.com'
      )`,
      totalSpend: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
      orderCount: sql<number>`count(*)`,
    })
      .from(orders)
      .where(and(
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
        eq(orders.status, 'confirmed'),
      ))
      .groupBy(orders.userId, orders.shippingFirstName, orders.shippingLastName)
      .orderBy(sql`4 DESC`)
      .limit(10)
      .all(),

    // Customer growth: new customerUsers by day
    db.select({
      date: sql<string>`DATE(${customerUsers.createdAt})`,
      count: sql<number>`count(*)`,
    })
      .from(customerUsers)
      .where(and(
        gte(customerUsers.createdAt, from),
        lte(customerUsers.createdAt, to),
      ))
      .groupBy(sql`DATE(${customerUsers.createdAt})`)
      .all(),
  ]);

  const ordersCount = totalOrders?.count ?? 0;
  const customersCount = totalCustomers?.count ?? 0;

  // Mask emails for privacy
  const topCustomers = topCustomersRaw.map(c => ({
    email: maskEmail(c.rawEmail),
    name: c.name,
    totalSpend: c.totalSpend,
    orderCount: c.orderCount,
  }));

  return c.json({
    overview: {
      totalCustomers: customersCount,
      totalOrders: ordersCount,
      avgOrders: customersCount > 0 ? ordersCount / customersCount : 0,
      avgOrderValue: avgOrderValue?.aov ?? 0,
    },
    topCustomers,
    customerGrowth: fillDays(customerGrowthRaw, 'date', dateRange(new Date(from), new Date(to)), { count: 0 }),
    // TODO: Implement cohort analysis — requires complex multi-period aggregation
    cohortData: [],
  });
});

// ─── Task 11: GET /services — Learn & Coaching deep-dive ──

analyticsRoutes.get('/services', adminAuth, async (c) => {
  const db = c.get('db');
  const { from, to } = parseDateRange(c);

  const [
    workshops,
    enrollmentTrendRaw,
    coaching,
    enrollmentsByStatus,
  ] = await Promise.all([
    // Workshops from learnItems ordered by enrolledCount DESC
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

    // Enrollment trend grouped by DATE(enrolledAt)
    db.select({
      date: sql<string>`DATE(${enrollments.enrolledAt})`,
      count: sql<number>`count(*)`,
    })
      .from(enrollments)
      .where(and(
        gte(enrollments.enrolledAt, from),
        lte(enrollments.enrolledAt, to),
      ))
      .groupBy(sql`DATE(${enrollments.enrolledAt})`)
      .all(),

    // Coaching packages where not archived (active)
    db.select({
      id: coachingPackages.id,
      title: coachingPackages.title,
      price: coachingPackages.price,
      description: coachingPackages.description,
    })
      .from(coachingPackages)
      .where(eq(coachingPackages.archived, false))
      .all(),

    // Enrollments grouped by status
    db.select({
      status: enrollments.status,
      count: sql<number>`count(*)`,
    })
      .from(enrollments)
      .groupBy(enrollments.status)
      .all(),
  ]);

  const days = dateRange(new Date(from), new Date(to));
  return c.json({
    workshops,
    enrollmentTrend: fillDays(enrollmentTrendRaw, 'date', days, { count: 0 }),
    coaching,
    enrollmentsByStatus,
  });
});
