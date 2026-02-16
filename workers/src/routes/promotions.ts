import { Hono } from 'hono';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { discountCodes } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const promotionsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

// ─── GET / — List all discount codes with filters ────────
promotionsRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, parseInt(c.req.query('limit') || '25'));
  const status = c.req.query('status') || '';
  const type = c.req.query('type') || '';
  const search = c.req.query('search') || '';

  const now = new Date().toISOString();
  const conditions: any[] = [];

  // Status filtering
  if (status === 'active') {
    conditions.push(eq(discountCodes.active, true));
    conditions.push(
      sql`(${discountCodes.expiresAt} IS NULL OR ${discountCodes.expiresAt} > ${now})`
    );
    conditions.push(
      sql`(${discountCodes.startsAt} IS NULL OR ${discountCodes.startsAt} <= ${now})`
    );
  } else if (status === 'inactive') {
    conditions.push(eq(discountCodes.active, false));
  } else if (status === 'expired') {
    conditions.push(
      sql`${discountCodes.expiresAt} IS NOT NULL AND ${discountCodes.expiresAt} <= ${now}`
    );
  } else if (status === 'scheduled') {
    conditions.push(
      sql`${discountCodes.startsAt} IS NOT NULL AND ${discountCodes.startsAt} > ${now}`
    );
  }

  // Type filtering
  if (type) {
    conditions.push(eq(discountCodes.type, type as any));
  }

  // Search filtering (code or name)
  if (search) {
    conditions.push(
      sql`(LOWER(${discountCodes.code}) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(${discountCodes.name}) LIKE ${`%${search.toLowerCase()}%`})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(discountCodes)
    .where(whereClause)
    .get();
  const total = countResult?.count ?? 0;

  // Get paginated rows
  const codes = await db
    .select()
    .from(discountCodes)
    .where(whereClause)
    .orderBy(desc(discountCodes.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  // Aggregate stats (always computed across all codes, not filtered)
  const statsResult = await db.select({
    totalCodes: sql<number>`count(*)`,
    totalActive: sql<number>`sum(CASE WHEN ${discountCodes.active} = 1 AND (${discountCodes.expiresAt} IS NULL OR ${discountCodes.expiresAt} > ${now}) AND (${discountCodes.startsAt} IS NULL OR ${discountCodes.startsAt} <= ${now}) THEN 1 ELSE 0 END)`,
    totalUsage: sql<number>`sum(${discountCodes.usageCount})`,
  }).from(discountCodes).get();

  return c.json({
    codes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalCodes: statsResult?.totalCodes ?? 0,
      totalActive: statsResult?.totalActive ?? 0,
      totalUsage: statsResult?.totalUsage ?? 0,
    },
  });
});

// ─── POST / — Create discount code + sync to Stripe ──────
promotionsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const body = await c.req.json();

  const {
    code,
    name,
    type,
    value,
    currency,
    minOrderAmount,
    maxDiscountAmount,
    startsAt,
    expiresAt,
    usageLimit,
    perCustomerLimit,
    firstTimeOnly,
    applicableTo,
    productIds,
    categories,
  } = body;

  // Validate required fields
  if (!code || !name || !type) {
    return c.json({ error: 'code, name, and type are required' }, 400);
  }

  // Validate code format: alphanumeric only (A-Z, 0-9)
  const upperCode = String(code).toUpperCase().trim();
  if (!/^[A-Z0-9]+$/.test(upperCode)) {
    return c.json({ error: 'Code must contain only letters (A-Z) and numbers (0-9)' }, 400);
  }

  // Check for duplicate code
  const existing = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.code, upperCode))
    .get();
  if (existing) {
    return c.json({ error: 'A discount code with this code already exists' }, 409);
  }

  // Stripe sync
  let stripeCouponId: string | null = null;
  let stripePromotionCodeId: string | null = null;

  try {
    const stripe = getStripe(c.env.STRIPE_SECRET_KEY);

    // Create Stripe coupon
    const couponParams: Stripe.CouponCreateParams = {
      duration: 'once',
      name: name,
      currency: 'aud',
    };

    if (type === 'percentage') {
      couponParams.percent_off = value;
    } else if (type === 'fixed_amount') {
      couponParams.amount_off = Math.round(value * 100);
    } else if (type === 'free_shipping') {
      // Free shipping: create a coupon with percent_off=0; actual shipping discount is handled via Stripe shipping rates
      couponParams.percent_off = 0;
    }

    const stripeCoupon = await stripe.coupons.create(couponParams);
    stripeCouponId = stripeCoupon.id;

    // Create Stripe promotion code
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: stripeCoupon.id,
      code: upperCode,
    };

    if (usageLimit) {
      promoParams.max_redemptions = usageLimit;
    }
    if (expiresAt) {
      promoParams.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const restrictions: Stripe.PromotionCodeCreateParams.Restrictions = {};
    if (firstTimeOnly) {
      restrictions.first_time_transaction = true;
    }
    if (minOrderAmount) {
      restrictions.minimum_amount = Math.round(minOrderAmount * 100);
      restrictions.minimum_amount_currency = 'aud';
    }
    if (Object.keys(restrictions).length > 0) {
      promoParams.restrictions = restrictions;
    }

    const stripePromo = await stripe.promotionCodes.create(promoParams);
    stripePromotionCodeId = stripePromo.id;
  } catch (err) {
    console.error('Stripe sync failed during code creation:', err);
    // Continue saving to D1 without Stripe IDs
  }

  // Save to D1
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(discountCodes).values({
    id,
    code: upperCode,
    name,
    type,
    value: value ?? 0,
    currency: currency || 'AUD',
    minOrderAmount: minOrderAmount ?? null,
    maxDiscountAmount: maxDiscountAmount ?? null,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    usageLimit: usageLimit ?? null,
    usageCount: 0,
    perCustomerLimit: perCustomerLimit ?? 1,
    firstTimeOnly: firstTimeOnly ?? false,
    applicableTo: applicableTo || 'all',
    productIds: productIds || [],
    categories: categories || [],
    stripeCouponId,
    stripePromotionCodeId,
    active: true,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  await logActivity(db, 'create', 'discount_code', created, user);

  return c.json(created, 201);
});

// ─── GET /:id — Get single discount code ─────────────────
promotionsRoutes.get('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const code = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  if (!code) {
    return c.json({ error: 'Discount code not found' }, 404);
  }

  return c.json(code);
});

// ─── PUT /:id — Update discount code ─────────────────────
promotionsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();

  const existing = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Discount code not found' }, 404);
  }

  const now = new Date().toISOString();

  // Build update set
  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.value !== undefined) updateData.value = body.value;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.minOrderAmount !== undefined) updateData.minOrderAmount = body.minOrderAmount;
  if (body.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = body.maxDiscountAmount;
  if (body.startsAt !== undefined) updateData.startsAt = body.startsAt;
  if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt;
  if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit;
  if (body.perCustomerLimit !== undefined) updateData.perCustomerLimit = body.perCustomerLimit;
  if (body.firstTimeOnly !== undefined) updateData.firstTimeOnly = body.firstTimeOnly;
  if (body.applicableTo !== undefined) updateData.applicableTo = body.applicableTo;
  if (body.productIds !== undefined) updateData.productIds = body.productIds;
  if (body.categories !== undefined) updateData.categories = body.categories;
  if (body.active !== undefined) updateData.active = body.active;

  // If active status changed, update Stripe promotion code
  if (body.active !== undefined && body.active !== existing.active && existing.stripePromotionCodeId) {
    try {
      const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
      await stripe.promotionCodes.update(existing.stripePromotionCodeId, {
        active: body.active,
      });
    } catch (err) {
      console.error('Stripe promotion code update failed:', err);
    }
  }

  await db.update(discountCodes)
    .set(updateData)
    .where(eq(discountCodes.id, id))
    .run();

  const updated = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  await logActivity(db, 'update', 'discount_code', updated, user);

  return c.json(updated);
});

// ─── POST /:id/toggle — Toggle active/inactive ───────────
promotionsRoutes.post('/:id/toggle', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Discount code not found' }, 404);
  }

  const newActive = !existing.active;

  // Update Stripe promotion code active status
  if (existing.stripePromotionCodeId) {
    try {
      const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
      await stripe.promotionCodes.update(existing.stripePromotionCodeId, {
        active: newActive,
      });
    } catch (err) {
      console.error('Stripe promotion code toggle failed:', err);
    }
  }

  await db.update(discountCodes)
    .set({
      active: newActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(discountCodes.id, id))
    .run();

  const updated = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  await logActivity(db, 'update', 'discount_code', updated, user);

  return c.json(updated);
});

// ─── POST /:id/duplicate — Duplicate a discount code ─────
promotionsRoutes.post('/:id/duplicate', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Discount code not found' }, 404);
  }

  // Generate new code
  const newCode = `${existing.code}-COPY`;

  // Check if the copy code already exists
  const copyExists = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.code, newCode))
    .get();
  if (copyExists) {
    return c.json({ error: `Duplicate code "${newCode}" already exists. Please rename the existing copy first.` }, 409);
  }

  // Create new Stripe coupon + promotion code
  let stripeCouponId: string | null = null;
  let stripePromotionCodeId: string | null = null;

  try {
    const stripe = getStripe(c.env.STRIPE_SECRET_KEY);

    // Create Stripe coupon
    const couponParams: Stripe.CouponCreateParams = {
      duration: 'once',
      name: existing.name,
      currency: 'aud',
    };

    if (existing.type === 'percentage') {
      couponParams.percent_off = existing.value;
    } else if (existing.type === 'fixed_amount') {
      couponParams.amount_off = Math.round(existing.value * 100);
    } else if (existing.type === 'free_shipping') {
      couponParams.percent_off = 0;
    }

    const stripeCoupon = await stripe.coupons.create(couponParams);
    stripeCouponId = stripeCoupon.id;

    // Create Stripe promotion code
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: stripeCoupon.id,
      code: newCode,
    };

    if (existing.usageLimit) {
      promoParams.max_redemptions = existing.usageLimit;
    }
    if (existing.expiresAt) {
      promoParams.expires_at = Math.floor(new Date(existing.expiresAt).getTime() / 1000);
    }

    const restrictions: Stripe.PromotionCodeCreateParams.Restrictions = {};
    if (existing.firstTimeOnly) {
      restrictions.first_time_transaction = true;
    }
    if (existing.minOrderAmount) {
      restrictions.minimum_amount = Math.round(existing.minOrderAmount * 100);
      restrictions.minimum_amount_currency = 'aud';
    }
    if (Object.keys(restrictions).length > 0) {
      promoParams.restrictions = restrictions;
    }

    const stripePromo = await stripe.promotionCodes.create(promoParams);
    stripePromotionCodeId = stripePromo.id;
  } catch (err) {
    console.error('Stripe sync failed during code duplication:', err);
  }

  // Insert duplicate into D1
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(discountCodes).values({
    id: newId,
    code: newCode,
    name: existing.name,
    type: existing.type,
    value: existing.value,
    currency: existing.currency,
    minOrderAmount: existing.minOrderAmount,
    maxDiscountAmount: existing.maxDiscountAmount,
    startsAt: existing.startsAt,
    expiresAt: existing.expiresAt,
    usageLimit: existing.usageLimit,
    usageCount: 0,
    perCustomerLimit: existing.perCustomerLimit,
    firstTimeOnly: existing.firstTimeOnly,
    applicableTo: existing.applicableTo,
    productIds: (existing.productIds as string[]) || [],
    categories: (existing.categories as string[]) || [],
    stripeCouponId,
    stripePromotionCodeId,
    active: existing.active,
    createdAt: now,
    updatedAt: now,
  }).run();

  const duplicated = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, newId))
    .get();

  await logActivity(db, 'duplicate', 'discount_code', duplicated, user);

  return c.json(duplicated, 201);
});

// ─── DELETE /:id — Delete discount code ───────────────────
promotionsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await db.select()
    .from(discountCodes)
    .where(eq(discountCodes.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Discount code not found' }, 404);
  }

  // Deactivate Stripe promotion code if it exists
  if (existing.stripePromotionCodeId) {
    try {
      const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
      await stripe.promotionCodes.update(existing.stripePromotionCodeId, {
        active: false,
      });
    } catch (err) {
      console.error('Stripe promotion code deactivation failed:', err);
    }
  }

  // Delete from D1
  await db.delete(discountCodes).where(eq(discountCodes.id, id)).run();

  await logActivity(db, 'delete', 'discount_code', existing, user);

  return c.json({ success: true });
});
