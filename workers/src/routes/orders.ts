import { Hono } from 'hono';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { orders, orderItems } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const ordersRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply admin auth to all routes
ordersRoutes.use('*', adminAuth);

// ─── GET /export — Export orders as CSV ───────────────────
// Must be before /:id to avoid route conflict
ordersRoutes.get('/export', async (c) => {
  const db = c.get('db');

  const status = c.req.query('status') || '';
  const search = (c.req.query('search') || '').trim();
  const dateFrom = c.req.query('dateFrom') || '';
  const dateTo = c.req.query('dateTo') || '';

  const conditions: any[] = [];

  if (status) {
    conditions.push(eq(orders.status, status as any));
  }

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${orders.orderNumber}) LIKE ${pattern}
        OR LOWER(${orders.shippingFirstName} || ' ' || ${orders.shippingLastName}) LIKE ${pattern}
      )`
    );
  }

  if (dateFrom) {
    conditions.push(sql`${orders.createdAt} >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(sql`${orders.createdAt} <= ${dateTo}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch all matching orders
  const allOrders = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .all();

  // Fetch items for all orders to compute item count
  const allOrderIds = allOrders.map((o) => o.id);
  let itemCountMap: Record<string, number> = {};
  if (allOrderIds.length > 0) {
    const itemCounts = await db
      .select({
        orderId: orderItems.orderId,
        count: sql<number>`count(*)`,
      })
      .from(orderItems)
      .where(sql`${orderItems.orderId} IN (${sql.join(allOrderIds.map((id) => sql`${id}`), sql`, `)})`)
      .groupBy(orderItems.orderId)
      .all();
    for (const row of itemCounts) {
      itemCountMap[row.orderId] = row.count;
    }
  }

  // Build CSV
  const csvHeaders = [
    'Order Number',
    'Date',
    'Customer',
    'Status',
    'Items',
    'Subtotal',
    'Shipping',
    'Tax',
    'Total',
    'Currency',
    'Payment Status',
    'Tracking Number',
  ];

  const csvRows = allOrders.map((o) => {
    const customer = `${o.shippingFirstName} ${o.shippingLastName}`;
    const itemCount = itemCountMap[o.id] || 0;
    return [
      o.orderNumber,
      o.createdAt,
      `"${customer.replace(/"/g, '""')}"`,
      o.status,
      String(itemCount),
      o.subtotal,
      o.shipping,
      o.tax,
      o.total,
      o.currency,
      o.paymentStatus || 'pending',
      o.trackingNumber || '',
    ].join(',');
  });

  const csv = [csvHeaders.join(','), ...csvRows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET / — List orders with filters, search, pagination, stats ──
ordersRoutes.get('/', async (c) => {
  const db = c.get('db');

  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, parseInt(c.req.query('limit') || '25'));
  const status = c.req.query('status') || '';
  const search = (c.req.query('search') || '').trim();
  const dateFrom = c.req.query('dateFrom') || '';
  const dateTo = c.req.query('dateTo') || '';
  const sortBy = c.req.query('sortBy') || 'createdAt';
  const sortOrder = c.req.query('sortOrder') || 'desc';

  // Build filter conditions
  const conditions: any[] = [];

  if (status) {
    conditions.push(eq(orders.status, status as any));
  }

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${orders.orderNumber}) LIKE ${pattern}
        OR LOWER(${orders.shippingFirstName} || ' ' || ${orders.shippingLastName}) LIKE ${pattern}
      )`
    );
  }

  if (dateFrom) {
    conditions.push(sql`${orders.createdAt} >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(sql`${orders.createdAt} <= ${dateTo}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Resolve sort column
  const sortColumnMap: Record<string, any> = {
    createdAt: orders.createdAt,
    total: orders.total,
    orderNumber: orders.orderNumber,
    status: orders.status,
  };
  const sortCol = sortColumnMap[sortBy] || orders.createdAt;
  const orderFn = sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

  // Fetch paginated orders and total count in parallel
  const [orderRows, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orderFn)
      .limit(limit)
      .offset((page - 1) * limit)
      .all(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(whereClause)
      .get(),
  ]);

  const total = countResult?.count ?? 0;

  // Compute global stats (across ALL orders, unfiltered) for the dashboard
  const statsResult = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      totalRevenue: sql<number>`COALESCE(sum(CAST(${orders.total} AS REAL)), 0)`,
      pendingOrders: sql<number>`sum(CASE WHEN ${orders.status} = 'pending' THEN 1 ELSE 0 END)`,
      confirmedOrders: sql<number>`sum(CASE WHEN ${orders.status} = 'confirmed' THEN 1 ELSE 0 END)`,
      shippedOrders: sql<number>`sum(CASE WHEN ${orders.status} = 'shipped' THEN 1 ELSE 0 END)`,
      deliveredOrders: sql<number>`sum(CASE WHEN ${orders.status} = 'delivered' THEN 1 ELSE 0 END)`,
      cancelledOrders: sql<number>`sum(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    })
    .from(orders)
    .get();

  return c.json({
    orders: orderRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalOrders: statsResult?.totalOrders ?? 0,
      totalRevenue: statsResult?.totalRevenue ?? 0,
      pendingOrders: statsResult?.pendingOrders ?? 0,
      confirmedOrders: statsResult?.confirmedOrders ?? 0,
      shippedOrders: statsResult?.shippedOrders ?? 0,
      deliveredOrders: statsResult?.deliveredOrders ?? 0,
      cancelledOrders: statsResult?.cancelledOrders ?? 0,
    },
  });
});

// ─── GET /:id — Get single order with its items ──────────
ordersRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .all();

  return c.json({ order, items });
});

// ─── PATCH /:id/status — Update order status ─────────────
ordersRoutes.patch('/:id/status', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');
  const { status: newStatus } = await c.req.json();

  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  // Set lifecycle timestamps based on status
  if (newStatus === 'shipped') {
    updateData.shippedAt = now;
  } else if (newStatus === 'delivered') {
    updateData.deliveredAt = now;
  } else if (newStatus === 'cancelled') {
    updateData.cancelledAt = now;
  }

  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, id))
    .run();

  const updated = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  await logActivity(db, 'update', 'order', updated, user, {
    status: { old: existing.status, new: newStatus },
  });

  return c.json(updated);
});

// ─── PATCH /:id/tracking — Add/update tracking info ──────
ordersRoutes.patch('/:id/tracking', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');
  const { trackingNumber, trackingUrl } = await c.req.json();

  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
  if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;

  // Auto-update status to 'shipped' if currently 'confirmed'
  if (existing.status === 'confirmed') {
    updateData.status = 'shipped';
    updateData.shippedAt = now;
  }

  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, id))
    .run();

  const updated = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  await logActivity(db, 'update', 'order', updated, user, {
    trackingNumber: { old: existing.trackingNumber, new: trackingNumber ?? existing.trackingNumber },
    trackingUrl: { old: existing.trackingUrl, new: trackingUrl ?? existing.trackingUrl },
  });

  return c.json(updated);
});

// ─── PATCH /:id/notes — Update internal notes ────────────
ordersRoutes.patch('/:id/notes', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');
  const { notes } = await c.req.json();

  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const now = new Date().toISOString();

  await db
    .update(orders)
    .set({ notes, updatedAt: now })
    .where(eq(orders.id, id))
    .run();

  const updated = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  await logActivity(db, 'update', 'order', updated, user, {
    notes: { old: existing.notes, new: notes },
  });

  return c.json(updated);
});
