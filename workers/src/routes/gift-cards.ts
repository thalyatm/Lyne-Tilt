import { Hono } from 'hono';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { giftCards, giftCardTransactions } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const giftCardsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helper: generate a unique gift card code ─────────────
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // Format: XXXX-XXXX-XXXX-XXXX
}

// ============================================
// PUBLIC ENDPOINTS (no auth)
// ============================================

// ─── POST /check-balance — Check gift card balance ────────
giftCardsRoutes.post('/check-balance', async (c) => {
  const db = c.get('db');
  const { code } = await c.req.json();

  if (!code) {
    return c.json({ valid: false, error: 'Gift card code is required' }, 400);
  }

  const upperCode = code.toUpperCase().trim();

  const card = await db.select()
    .from(giftCards)
    .where(sql`UPPER(${giftCards.code}) = ${upperCode}`)
    .get();

  if (!card) {
    return c.json({ valid: false, error: 'Gift card not found' });
  }

  if (card.status === 'disabled') {
    return c.json({ valid: false, error: 'Gift card has been disabled' });
  }

  if (card.status === 'depleted') {
    return c.json({ valid: false, error: 'Gift card has no remaining balance' });
  }

  // Check expiration
  if (card.expiresAt && card.expiresAt < new Date().toISOString()) {
    return c.json({ valid: false, error: 'Gift card has expired' });
  }

  return c.json({
    valid: true,
    balance: card.currentBalance,
    currency: card.currency,
  });
});

// ─── POST /redeem — Redeem gift card at checkout ──────────
giftCardsRoutes.post('/redeem', async (c) => {
  const db = c.get('db');
  const { code, amount, orderId } = await c.req.json();

  if (!code || !amount) {
    return c.json({ error: 'code and amount are required' }, 400);
  }

  const upperCode = code.toUpperCase().trim();
  const redeemAmount = parseFloat(amount);

  if (isNaN(redeemAmount) || redeemAmount <= 0) {
    return c.json({ error: 'Amount must be a positive number' }, 400);
  }

  const card = await db.select()
    .from(giftCards)
    .where(sql`UPPER(${giftCards.code}) = ${upperCode}`)
    .get();

  if (!card) {
    return c.json({ error: 'Gift card not found' }, 404);
  }

  if (card.status !== 'active') {
    return c.json({ error: `Gift card is ${card.status}` }, 400);
  }

  // Check expiration
  if (card.expiresAt && card.expiresAt < new Date().toISOString()) {
    return c.json({ error: 'Gift card has expired' }, 400);
  }

  const currentBalance = parseFloat(card.currentBalance);
  if (redeemAmount > currentBalance) {
    return c.json({ error: 'Insufficient balance', currentBalance: card.currentBalance }, 400);
  }

  const newBalance = (currentBalance - redeemAmount).toFixed(2);
  const newStatus = parseFloat(newBalance) === 0 ? 'depleted' : 'active';
  const now = new Date().toISOString();

  // Update card balance
  await db.update(giftCards)
    .set({
      currentBalance: newBalance,
      status: newStatus as any,
      updatedAt: now,
    })
    .where(eq(giftCards.id, card.id))
    .run();

  // Create transaction record
  await db.insert(giftCardTransactions).values({
    id: crypto.randomUUID(),
    giftCardId: card.id,
    type: 'redemption',
    amount: `-${redeemAmount.toFixed(2)}`,
    balanceAfter: newBalance,
    orderId: orderId || null,
    note: null,
    createdAt: now,
  }).run();

  return c.json({
    success: true,
    amountDeducted: redeemAmount.toFixed(2),
    remainingBalance: newBalance,
  });
});

// ============================================
// ADMIN ENDPOINTS (require auth)
// ============================================

// ─── GET / — List gift cards with stats ───────────────────
giftCardsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const status = c.req.query('status') || 'all';
  const search = (c.req.query('search') || '').trim();
  const sort = c.req.query('sort') || 'newest';

  const conditions: any[] = [];

  // Status filtering
  if (status !== 'all') {
    conditions.push(eq(giftCards.status, status as any));
  }

  // Search filtering (code, purchaserEmail, recipientEmail, recipientName)
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${giftCards.code}) LIKE ${pattern}
        OR LOWER(${giftCards.purchaserEmail}) LIKE ${pattern}
        OR LOWER(${giftCards.recipientEmail}) LIKE ${pattern}
        OR LOWER(${giftCards.recipientName}) LIKE ${pattern}
      )`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort order
  let orderByClause;
  switch (sort) {
    case 'oldest':
      orderByClause = asc(giftCards.createdAt);
      break;
    case 'highest-balance':
      orderByClause = sql`CAST(${giftCards.currentBalance} AS REAL) DESC`;
      break;
    case 'lowest-balance':
      orderByClause = sql`CAST(${giftCards.currentBalance} AS REAL) ASC`;
      break;
    case 'newest':
    default:
      orderByClause = desc(giftCards.createdAt);
      break;
  }

  // Fetch gift cards
  const cards = await db
    .select()
    .from(giftCards)
    .where(whereClause)
    .orderBy(orderByClause)
    .all();

  // Aggregate stats (across all cards, not filtered)
  const statsResult = await db.select({
    totalCards: sql<number>`count(*)`,
    activeCards: sql<number>`sum(CASE WHEN ${giftCards.status} = 'active' THEN 1 ELSE 0 END)`,
    totalValueIssued: sql<number>`COALESCE(sum(CAST(${giftCards.initialBalance} AS REAL)), 0)`,
    totalBalanceRemaining: sql<number>`COALESCE(sum(CAST(${giftCards.currentBalance} AS REAL)), 0)`,
  }).from(giftCards).get();

  const totalValueIssued = statsResult?.totalValueIssued ?? 0;
  const totalBalanceRemaining = statsResult?.totalBalanceRemaining ?? 0;
  const totalValueRedeemed = totalValueIssued - totalBalanceRemaining;

  return c.json({
    giftCards: cards,
    stats: {
      totalCards: statsResult?.totalCards ?? 0,
      activeCards: statsResult?.activeCards ?? 0,
      totalValueIssued: parseFloat(totalValueIssued.toFixed(2)),
      totalValueRedeemed: parseFloat(totalValueRedeemed.toFixed(2)),
      totalBalanceRemaining: parseFloat(totalBalanceRemaining.toFixed(2)),
    },
  });
});

// ─── GET /:id — Single gift card with transactions ───────
giftCardsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const card = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  if (!card) {
    return c.json({ error: 'Gift card not found' }, 404);
  }

  const transactions = await db.select()
    .from(giftCardTransactions)
    .where(eq(giftCardTransactions.giftCardId, id))
    .orderBy(desc(giftCardTransactions.createdAt))
    .all();

  return c.json({ ...card, transactions });
});

// ─── POST / — Create a gift card ─────────────────────────
giftCardsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const {
    initialBalance,
    recipientEmail,
    recipientName,
    purchaserEmail,
    purchaserName,
    personalMessage,
    expiresAt,
  } = body;

  if (!initialBalance) {
    return c.json({ error: 'initialBalance is required' }, 400);
  }

  const balance = parseFloat(initialBalance);
  if (isNaN(balance) || balance <= 0) {
    return c.json({ error: 'initialBalance must be a positive number' }, 400);
  }

  // Generate a unique code (retry if collision)
  let code: string;
  let attempts = 0;
  do {
    code = generateGiftCardCode();
    const existing = await db.select()
      .from(giftCards)
      .where(eq(giftCards.code, code))
      .get();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return c.json({ error: 'Failed to generate unique code' }, 500);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const balanceStr = balance.toFixed(2);

  await db.insert(giftCards).values({
    id,
    code,
    initialBalance: balanceStr,
    currentBalance: balanceStr,
    currency: 'AUD',
    status: 'active',
    purchaserEmail: purchaserEmail || null,
    purchaserName: purchaserName || null,
    recipientEmail: recipientEmail || null,
    recipientName: recipientName || null,
    personalMessage: personalMessage || null,
    orderId: null,
    expiresAt: expiresAt || null,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Create purchase transaction
  await db.insert(giftCardTransactions).values({
    id: crypto.randomUUID(),
    giftCardId: id,
    type: 'purchase',
    amount: balanceStr,
    balanceAfter: balanceStr,
    orderId: null,
    note: 'Gift card created',
    createdAt: now,
  }).run();

  const created = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  return c.json(created, 201);
});

// ─── POST /bulk — Create multiple gift cards ─────────────
giftCardsRoutes.post('/bulk', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const { count, initialBalance, expiresAt } = body;

  if (!count || !initialBalance) {
    return c.json({ error: 'count and initialBalance are required' }, 400);
  }

  const cardCount = parseInt(count);
  if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
    return c.json({ error: 'count must be between 1 and 100' }, 400);
  }

  const balance = parseFloat(initialBalance);
  if (isNaN(balance) || balance <= 0) {
    return c.json({ error: 'initialBalance must be a positive number' }, 400);
  }

  const balanceStr = balance.toFixed(2);
  const now = new Date().toISOString();
  const createdCards: any[] = [];

  for (let i = 0; i < cardCount; i++) {
    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateGiftCardCode();
      const existing = await db.select()
        .from(giftCards)
        .where(eq(giftCards.code, code))
        .get();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      continue; // Skip this card if we can't generate a unique code
    }

    const id = crypto.randomUUID();

    await db.insert(giftCards).values({
      id,
      code,
      initialBalance: balanceStr,
      currentBalance: balanceStr,
      currency: 'AUD',
      status: 'active',
      purchaserEmail: null,
      purchaserName: null,
      recipientEmail: null,
      recipientName: null,
      personalMessage: null,
      orderId: null,
      expiresAt: expiresAt || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Create purchase transaction
    await db.insert(giftCardTransactions).values({
      id: crypto.randomUUID(),
      giftCardId: id,
      type: 'purchase',
      amount: balanceStr,
      balanceAfter: balanceStr,
      orderId: null,
      note: 'Bulk gift card created',
      createdAt: now,
    }).run();

    const created = await db.select()
      .from(giftCards)
      .where(eq(giftCards.id, id))
      .get();

    if (created) createdCards.push(created);
  }

  return c.json({ giftCards: createdCards, count: createdCards.length }, 201);
});

// ─── PATCH /:id — Update gift card details ────────────────
giftCardsRoutes.patch('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Gift card not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (body.status !== undefined) updateData.status = body.status;
  if (body.recipientEmail !== undefined) updateData.recipientEmail = body.recipientEmail;
  if (body.recipientName !== undefined) updateData.recipientName = body.recipientName;
  if (body.personalMessage !== undefined) updateData.personalMessage = body.personalMessage;
  if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt;

  await db.update(giftCards)
    .set(updateData)
    .where(eq(giftCards.id, id))
    .run();

  const updated = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  return c.json(updated);
});

// ─── POST /:id/adjust — Adjust gift card balance ─────────
giftCardsRoutes.post('/:id/adjust', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { amount, type, note } = body;

  if (amount === undefined || !type) {
    return c.json({ error: 'amount and type are required' }, 400);
  }

  if (type !== 'adjustment' && type !== 'refund') {
    return c.json({ error: 'type must be "adjustment" or "refund"' }, 400);
  }

  const adjustAmount = parseFloat(amount);
  if (isNaN(adjustAmount) || adjustAmount === 0) {
    return c.json({ error: 'Amount must be a non-zero number' }, 400);
  }

  const card = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  if (!card) {
    return c.json({ error: 'Gift card not found' }, 404);
  }

  const currentBalance = parseFloat(card.currentBalance);
  const newBalance = currentBalance + adjustAmount;

  if (newBalance < 0) {
    return c.json({ error: 'Balance cannot go below 0' }, 400);
  }

  const newBalanceStr = newBalance.toFixed(2);
  const now = new Date().toISOString();

  // Determine new status
  let newStatus = card.status;
  if (newBalance === 0) {
    newStatus = 'depleted';
  } else if (card.status === 'depleted' && newBalance > 0) {
    newStatus = 'active';
  }

  // Update card balance
  await db.update(giftCards)
    .set({
      currentBalance: newBalanceStr,
      status: newStatus as any,
      updatedAt: now,
    })
    .where(eq(giftCards.id, id))
    .run();

  // Create transaction record
  await db.insert(giftCardTransactions).values({
    id: crypto.randomUUID(),
    giftCardId: id,
    type: type,
    amount: adjustAmount.toFixed(2),
    balanceAfter: newBalanceStr,
    orderId: null,
    note: note || null,
    createdAt: now,
  }).run();

  const updated = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  return c.json(updated);
});

// ─── DELETE /:id — Delete gift card ───────────────────────
giftCardsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select()
    .from(giftCards)
    .where(eq(giftCards.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Gift card not found' }, 404);
  }

  // Transactions are cascade-deleted via FK constraint
  await db.delete(giftCards).where(eq(giftCards.id, id)).run();

  return c.json({ success: true });
});
