import { Hono } from 'hono';
import { eq, and, desc, sql, lte, isNotNull } from 'drizzle-orm';
import { abandonedCarts, abandonedCartItems, orders } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import { triggerAutomation } from '../utils/automations';
import type { Bindings, Variables } from '../index';

export const abandonedCartsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// PUBLIC ENDPOINTS (no auth)
// ============================================

// ─── POST /capture — Save/update a cart snapshot ──────────
abandonedCartsRoutes.post('/capture', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const { email, customerName, sessionId, items } = body;

  if (!email || !items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Email and at least one item are required' }, 400);
  }

  // Calculate totals
  const totalValue = items.reduce(
    (sum: number, item: any) => sum + parseFloat(item.price || '0') * (item.quantity || 1),
    0
  ).toFixed(2);
  const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  const now = new Date().toISOString();

  // Check for existing abandoned cart with this email
  const existing = await db
    .select()
    .from(abandonedCarts)
    .where(and(
      eq(abandonedCarts.email, email),
      eq(abandonedCarts.status, 'abandoned'),
    ))
    .get();

  let cartId: string;

  if (existing) {
    cartId = existing.id;

    // Delete old items
    await db.delete(abandonedCartItems).where(eq(abandonedCartItems.cartId, cartId));

    // Update cart
    await db.update(abandonedCarts)
      .set({
        customerName: customerName || existing.customerName,
        sessionId: sessionId || existing.sessionId,
        totalValue,
        itemCount,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(abandonedCarts.id, cartId));
  } else {
    // Create new cart
    cartId = crypto.randomUUID();
    await db.insert(abandonedCarts).values({
      id: cartId,
      email,
      customerName: customerName || null,
      sessionId: sessionId || null,
      recoveryToken: crypto.randomUUID(),
      status: 'abandoned',
      totalValue,
      itemCount,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Insert new items
  for (const item of items) {
    await db.insert(abandonedCartItems).values({
      cartId,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity || 1,
      image: item.image || null,
      variant: item.variant || null,
    });
  }

  return c.json({ success: true, cartId });
});

// ─── GET /recover/:token — Recover a cart by token ────────
abandonedCartsRoutes.get('/recover/:token', async (c) => {
  const db = c.get('db');
  const token = c.req.param('token');

  const cart = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.recoveryToken, token))
    .get();

  if (!cart || cart.status !== 'abandoned') {
    return c.json({ error: 'Cart not found or already recovered' }, 404);
  }

  const items = await db
    .select()
    .from(abandonedCartItems)
    .where(eq(abandonedCartItems.cartId, cart.id))
    .all();

  return c.json({
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      variant: item.variant,
    })),
  });
});

// ============================================
// ADMIN ENDPOINTS (auth required)
// ============================================

// ─── GET / — List abandoned carts with stats ──────────────
abandonedCartsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');

  const status = c.req.query('status') || '';
  const search = (c.req.query('search') || '').trim();
  const from = c.req.query('from') || '';
  const to = c.req.query('to') || '';

  // Build filter conditions
  const conditions: any[] = [];

  if (status && status !== 'all') {
    conditions.push(eq(abandonedCarts.status, status as any));
  }

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${abandonedCarts.email}) LIKE ${pattern}
        OR LOWER(${abandonedCarts.customerName}) LIKE ${pattern}
      )`
    );
  }

  if (from) {
    conditions.push(sql`${abandonedCarts.lastActivityAt} >= ${from}`);
  }
  if (to) {
    conditions.push(sql`${abandonedCarts.lastActivityAt} <= ${to}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch carts
  const carts = await db
    .select()
    .from(abandonedCarts)
    .where(whereClause)
    .orderBy(desc(abandonedCarts.lastActivityAt))
    .all();

  // Fetch items for each cart
  const cartsWithItems = await Promise.all(
    carts.map(async (cart) => {
      const items = await db
        .select()
        .from(abandonedCartItems)
        .where(eq(abandonedCartItems.cartId, cart.id))
        .all();

      return {
        ...cart,
        items: items.map((item) => ({
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
      };
    })
  );

  // Compute stats (across ALL carts, unfiltered)
  const statsResult = await db
    .select({
      totalAbandoned: sql<number>`sum(CASE WHEN ${abandonedCarts.status} = 'abandoned' THEN 1 ELSE 0 END)`,
      totalRecovered: sql<number>`sum(CASE WHEN ${abandonedCarts.status} = 'recovered' THEN 1 ELSE 0 END)`,
      totalAll: sql<number>`count(*)`,
      totalLostRevenue: sql<number>`COALESCE(sum(CASE WHEN ${abandonedCarts.status} = 'abandoned' THEN CAST(${abandonedCarts.totalValue} AS REAL) ELSE 0 END), 0)`,
    })
    .from(abandonedCarts)
    .get();

  const totalAbandoned = statsResult?.totalAbandoned ?? 0;
  const totalRecovered = statsResult?.totalRecovered ?? 0;
  const totalAll = statsResult?.totalAll ?? 0;
  const recoveryRate = totalAll > 0
    ? Math.round((totalRecovered / totalAll) * 1000) / 10
    : 0;

  return c.json({
    carts: cartsWithItems,
    stats: {
      totalAbandoned,
      totalRecovered,
      recoveryRate,
      totalLostRevenue: statsResult?.totalLostRevenue ?? 0,
    },
  });
});

// ─── GET /:id — Single cart detail with items ─────────────
abandonedCartsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const cart = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.id, id))
    .get();

  if (!cart) {
    return c.json({ error: 'Abandoned cart not found' }, 404);
  }

  const items = await db
    .select()
    .from(abandonedCartItems)
    .where(eq(abandonedCartItems.cartId, id))
    .all();

  return c.json({ cart, items });
});

// ─── POST /:id/send-reminder — Manually send a recovery email ──
abandonedCartsRoutes.post('/:id/send-reminder', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const cart = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.id, id))
    .get();

  if (!cart) {
    return c.json({ error: 'Abandoned cart not found' }, 404);
  }

  if (!cart.email) {
    return c.json({ error: 'Cart has no email address' }, 400);
  }

  const items = await db
    .select()
    .from(abandonedCartItems)
    .where(eq(abandonedCartItems.cartId, id))
    .all();

  if (items.length === 0) {
    return c.json({ error: 'Cart has no items' }, 400);
  }

  const firstItem = items[0];
  const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
  const recoveryUrl = `${baseUrl}/#/checkout?recover=${cart.recoveryToken}`;

  await triggerAutomation(db, 'cart_abandoned', cart.email, cart.customerName || undefined, {
    cart_recovery_url: recoveryUrl,
    product_name: firstItem.productName,
    price: cart.totalValue,
    qty: String(cart.itemCount),
  });

  // Update email tracking
  const now = new Date().toISOString();
  await db.update(abandonedCarts)
    .set({
      emailSentAt: now,
      emailCount: sql`${abandonedCarts.emailCount} + 1`,
      updatedAt: now,
    })
    .where(eq(abandonedCarts.id, id));

  return c.json({ success: true, message: 'Recovery email queued' });
});

// ─── DELETE /:id — Delete an abandoned cart and its items ──
abandonedCartsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const cart = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.id, id))
    .get();

  if (!cart) {
    return c.json({ error: 'Abandoned cart not found' }, 404);
  }

  // Delete items first (cascade should handle this, but be explicit)
  await db.delete(abandonedCartItems).where(eq(abandonedCartItems.cartId, id));
  await db.delete(abandonedCarts).where(eq(abandonedCarts.id, id));

  return c.json({ success: true, message: 'Abandoned cart deleted' });
});
