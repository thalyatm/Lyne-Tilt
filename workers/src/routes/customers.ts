import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { customerUsers, orders, shippingAddresses } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const customersRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply admin auth to all routes
customersRoutes.use('*', adminAuth);

// ─── Helper: build WHERE + ORDER fragments ─────────────────
function buildFilters(search: string, status: string, sort: string) {
  const whereParts: ReturnType<typeof sql>[] = [];

  if (status === 'verified') {
    whereParts.push(sql`cu.email_verified = 1`);
  } else if (status === 'unverified') {
    whereParts.push(sql`cu.email_verified = 0`);
  }

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    whereParts.push(
      sql`(LOWER(cu.email) LIKE ${pattern} OR LOWER(cu.first_name) LIKE ${pattern} OR LOWER(cu.last_name) LIKE ${pattern})`
    );
  }

  const whereClause =
    whereParts.length > 0
      ? sql`WHERE ${sql.join(whereParts, sql` AND `)}`
      : sql``;

  let orderClause: ReturnType<typeof sql>;
  switch (sort) {
    case 'oldest':
      orderClause = sql`ORDER BY cu.created_at ASC`;
      break;
    case 'most-orders':
      orderClause = sql`ORDER BY orderCount DESC, cu.created_at DESC`;
      break;
    case 'highest-spend':
      orderClause = sql`ORDER BY totalSpend DESC, cu.created_at DESC`;
      break;
    default:
      orderClause = sql`ORDER BY cu.created_at DESC`;
      break;
  }

  return { whereClause, orderClause };
}

// ─── GET /export — Export customers as CSV ─────────────────
// Must be before /:id to avoid route conflict
customersRoutes.get('/export', async (c) => {
  const db = c.get('db');

  const rows = await db.all<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    email_verified: number;
    created_at: string;
    orderCount: number;
    totalSpend: number;
  }>(sql`
    SELECT
      cu.id,
      cu.email,
      cu.first_name,
      cu.last_name,
      cu.email_verified,
      cu.created_at,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(CAST(o.total AS REAL)), 0) AS totalSpend
    FROM customer_users cu
    LEFT JOIN orders o ON o.user_id = cu.id AND o.status != 'cancelled'
    GROUP BY cu.id
    ORDER BY cu.created_at DESC
  `);

  const csvHeaders = [
    'Email',
    'First Name',
    'Last Name',
    'Verified',
    'Orders',
    'Total Spend',
    'Joined',
  ];

  const csvRows = rows.map((r) =>
    [
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.first_name || '').replace(/"/g, '""')}"`,
      `"${(r.last_name || '').replace(/"/g, '""')}"`,
      r.email_verified ? 'Yes' : 'No',
      String(r.orderCount),
      (r.totalSpend || 0).toFixed(2),
      r.created_at,
    ].join(',')
  );

  const csv = [csvHeaders.join(','), ...csvRows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET / — List customers with stats ─────────────────────
customersRoutes.get('/', async (c) => {
  const db = c.get('db');

  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, parseInt(c.req.query('limit') || '20'));
  const search = (c.req.query('search') || '').trim();
  const status = c.req.query('status') || 'all';
  const sort = c.req.query('sort') || 'newest';
  const offset = (page - 1) * limit;

  const { whereClause, orderClause } = buildFilters(search, status, sort);

  // Fetch paginated customers with aggregated order data
  const customerRows = await db.all<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: number;
    createdAt: string;
    lastLoginAt: string | null;
    orderCount: number;
    totalSpend: number;
  }>(sql`
    SELECT
      cu.id,
      cu.email,
      cu.first_name AS firstName,
      cu.last_name AS lastName,
      cu.email_verified AS emailVerified,
      cu.created_at AS createdAt,
      cu.last_login_at AS lastLoginAt,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(CAST(o.total AS REAL)), 0) AS totalSpend
    FROM customer_users cu
    LEFT JOIN orders o ON o.user_id = cu.id AND o.status != 'cancelled'
    ${whereClause}
    GROUP BY cu.id
    ${orderClause}
    LIMIT ${limit} OFFSET ${offset}
  `);

  // Format customer rows
  const customers = customerRows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    emailVerified: Boolean(r.emailVerified),
    createdAt: r.createdAt,
    lastLoginAt: r.lastLoginAt,
    orderCount: r.orderCount,
    totalSpend: r.totalSpend,
  }));

  // Count total matching customers for pagination
  // Build simple WHERE for count (no join needed)
  const countWhereParts: ReturnType<typeof sql>[] = [];
  if (status === 'verified') {
    countWhereParts.push(sql`email_verified = 1`);
  } else if (status === 'unverified') {
    countWhereParts.push(sql`email_verified = 0`);
  }
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    countWhereParts.push(
      sql`(LOWER(email) LIKE ${pattern} OR LOWER(first_name) LIKE ${pattern} OR LOWER(last_name) LIKE ${pattern})`
    );
  }
  const countWhere =
    countWhereParts.length > 0
      ? sql`WHERE ${sql.join(countWhereParts, sql` AND `)}`
      : sql``;

  const countResult = await db.get<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM customer_users ${countWhere}`
  );
  const total = countResult?.total ?? 0;

  // Compute global stats (unfiltered)
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const statsResult = await db.get<{
    totalCustomers: number;
    verifiedCustomers: number;
    newThisMonth: number;
  }>(sql`
    SELECT
      COUNT(*) AS totalCustomers,
      SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) AS verifiedCustomers,
      SUM(CASE WHEN created_at >= ${firstOfMonth} THEN 1 ELSE 0 END) AS newThisMonth
    FROM customer_users
  `);

  const revenueResult = await db.get<{ totalRevenue: number }>(sql`
    SELECT COALESCE(SUM(CAST(total AS REAL)), 0) AS totalRevenue
    FROM orders
    WHERE status != 'cancelled'
  `);

  return c.json({
    customers,
    stats: {
      totalCustomers: statsResult?.totalCustomers ?? 0,
      verifiedCustomers: statsResult?.verifiedCustomers ?? 0,
      newThisMonth: statsResult?.newThisMonth ?? 0,
      totalRevenue: revenueResult?.totalRevenue ?? 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /:id — Customer detail ────────────────────────────
customersRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  // Get customer with order stats
  const customerRow = await db.get<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: number;
    stripeCustomerId: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    orderCount: number;
    totalSpend: number;
  }>(sql`
    SELECT
      cu.id,
      cu.email,
      cu.first_name AS firstName,
      cu.last_name AS lastName,
      cu.email_verified AS emailVerified,
      cu.stripe_customer_id AS stripeCustomerId,
      cu.created_at AS createdAt,
      cu.updated_at AS updatedAt,
      cu.last_login_at AS lastLoginAt,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(CAST(o.total AS REAL)), 0) AS totalSpend
    FROM customer_users cu
    LEFT JOIN orders o ON o.user_id = cu.id AND o.status != 'cancelled'
    WHERE cu.id = ${id}
    GROUP BY cu.id
  `);

  if (!customerRow) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  const customer = {
    id: customerRow.id,
    email: customerRow.email,
    firstName: customerRow.firstName,
    lastName: customerRow.lastName,
    emailVerified: Boolean(customerRow.emailVerified),
    stripeCustomerId: customerRow.stripeCustomerId,
    createdAt: customerRow.createdAt,
    updatedAt: customerRow.updatedAt,
    lastLoginAt: customerRow.lastLoginAt,
    orderCount: customerRow.orderCount,
    totalSpend: customerRow.totalSpend,
  };

  // Get recent orders, shipping addresses, and enrollment count in parallel
  const [customerOrders, addresses, enrollmentResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt))
      .limit(20)
      .all(),
    db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, id))
      .all(),
    db.get<{ count: number }>(sql`
      SELECT COUNT(*) AS count
      FROM cohort_enrollments
      WHERE customer_id = ${id}
    `),
  ]);

  return c.json({
    customer,
    orders: customerOrders,
    addresses,
    enrollmentCount: enrollmentResult?.count ?? 0,
  });
});
