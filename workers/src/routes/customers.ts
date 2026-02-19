import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { customerUsers, orders, shippingAddresses } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { sendEmail } from '../utils/email';
import type { Bindings, Variables } from '../index';

export const customersRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply admin auth to all routes
customersRoutes.use('*', adminAuth);

// ─── Helper: build WHERE + ORDER fragments ─────────────────
function buildFilters(search: string, status: string, sort: string, source: string) {
  const whereParts: ReturnType<typeof sql>[] = [];

  if (status === 'verified') {
    whereParts.push(sql`cu.email_verified = 1`);
  } else if (status === 'unverified') {
    whereParts.push(sql`cu.email_verified = 0`);
  }

  if (source && source !== 'all') {
    whereParts.push(sql`cu.source = ${source}`);
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
  const source = c.req.query('source') || 'all';
  const offset = (page - 1) * limit;

  const { whereClause, orderClause } = buildFilters(search, status, sort, source);

  // Fetch paginated customers with aggregated order data
  const customerRows = await db.all<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: number;
    authProvider: string;
    source: string;
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
      cu.auth_provider AS authProvider,
      cu.source,
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
    authProvider: r.authProvider || 'email',
    source: r.source || 'website',
    createdAt: r.createdAt,
    lastLoginAt: r.lastLoginAt,
    orderCount: r.orderCount,
    totalSpend: r.totalSpend,
  }));

  // Count total matching customers for pagination
  const countWhereParts: ReturnType<typeof sql>[] = [];
  if (status === 'verified') {
    countWhereParts.push(sql`email_verified = 1`);
  } else if (status === 'unverified') {
    countWhereParts.push(sql`email_verified = 0`);
  }
  if (source && source !== 'all') {
    countWhereParts.push(sql`source = ${source}`);
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
    authProvider: string;
    source: string;
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
      cu.auth_provider AS authProvider,
      cu.source,
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
    authProvider: customerRow.authProvider || 'email',
    source: customerRow.source || 'website',
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

// ─── POST /:id/send-reset — Admin sends password reset link ──
customersRoutes.post('/:id/send-reset', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const customer = await db.select().from(customerUsers).where(eq(customerUsers.id, id)).get();
  if (!customer) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  // Don't send reset to Google-only or SQ import accounts
  if (customer.authProvider === 'google') {
    return c.json({ error: 'Cannot reset password for Google accounts' }, 400);
  }
  if (customer.authProvider === 'none') {
    return c.json({ error: 'Cannot reset password for imported accounts without login' }, 400);
  }

  const resetToken = crypto.randomUUID();
  const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.update(customerUsers)
    .set({ resetToken, resetTokenExpiry: resetTokenExpiry, updatedAt: new Date().toISOString() })
    .where(eq(customerUsers.id, id));

  const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
  const resetUrl = `${baseUrl}/#/reset-password?token=${resetToken}`;

  try {
    await sendEmail(
      c.env,
      customer.email,
      'Reset your Lyne Tilt password',
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1c1917;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Password Reset</h1>
        <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
          Hi ${customer.firstName || 'there'}, a password reset was requested for your account. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #8d3038; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #a8a29e; font-size: 13px; line-height: 1.5;">
          This link expires in 24 hours. If you didn&rsquo;t request this, you can safely ignore this email.
        </p>
        <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
          Lyne Tilt Studio &mdash; Wearable Art &amp; Creative Coaching
        </p>
      </div>`,
    );
  } catch (err) {
    console.error('Failed to send reset email:', err);
    return c.json({ error: 'Failed to send email' }, 500);
  }

  return c.json({ success: true, message: `Reset link sent to ${customer.email}` });
});
