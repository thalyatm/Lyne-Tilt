import { Hono } from 'hono';
import { desc, eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const dataExportRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require admin auth
dataExportRoutes.use('*', adminAuth);

// ─── GET /summary — Record counts for all exportable data ───
dataExportRoutes.get('/summary', async (c) => {
  const db = c.get('db');

  const [products, reviews, giftCards, waitlist, bookings, abandonedCarts] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(schema.products).get(),
    db.select({ count: sql<number>`count(*)` }).from(schema.productReviews).get(),
    db.select({ count: sql<number>`count(*)` }).from(schema.giftCards).get(),
    db.select({ count: sql<number>`count(*)` }).from(schema.waitlist).get(),
    db.select({ count: sql<number>`count(*)` }).from(schema.coachingBookings).get(),
    db.select({ count: sql<number>`count(*)` }).from(schema.abandonedCarts).get(),
  ]);

  return c.json({
    products: products?.count ?? 0,
    reviews: reviews?.count ?? 0,
    giftCards: giftCards?.count ?? 0,
    waitlist: waitlist?.count ?? 0,
    bookings: bookings?.count ?? 0,
    abandonedCarts: abandonedCarts?.count ?? 0,
  });
});

/** Escape a value for CSV: wrap in quotes, double any internal quotes */
function csvVal(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

// ─── GET /products — Export all products as CSV ────────────
dataExportRoutes.get('/products', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select()
    .from(schema.products)
    .orderBy(desc(schema.products.createdAt))
    .all();

  const header = 'Name,Category,Price,CompareAtPrice,Availability,Quantity,Rating,ReviewCount,CreatedAt';
  const lines = rows.map((r) =>
    [
      r.name,
      r.category || '',
      r.price,
      r.compareAtPrice || '',
      r.availability || '',
      r.quantity ?? '',
      r.rating ?? '',
      r.reviewCount ?? '',
      r.createdAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET /reviews — Export all reviews as CSV ──────────────
dataExportRoutes.get('/reviews', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select({
      productName: schema.products.name,
      customerName: schema.productReviews.customerName,
      customerEmail: schema.productReviews.customerEmail,
      rating: schema.productReviews.rating,
      title: schema.productReviews.title,
      body: schema.productReviews.body,
      status: schema.productReviews.status,
      isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
      createdAt: schema.productReviews.createdAt,
    })
    .from(schema.productReviews)
    .leftJoin(schema.products, eq(schema.productReviews.productId, schema.products.id))
    .orderBy(desc(schema.productReviews.createdAt))
    .all();

  const header = 'ProductName,ReviewerName,Email,Rating,Title,Comment,Status,VerifiedPurchase,CreatedAt';
  const lines = rows.map((r) =>
    [
      r.productName || '',
      r.customerName || '',
      r.customerEmail || '',
      r.rating ?? '',
      r.title || '',
      r.body || '',
      r.status || '',
      r.isVerifiedPurchase ? 'Yes' : 'No',
      r.createdAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reviews-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET /gift-cards — Export gift cards as CSV ────────────
dataExportRoutes.get('/gift-cards', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select()
    .from(schema.giftCards)
    .orderBy(desc(schema.giftCards.createdAt))
    .all();

  const header = 'Code,InitialBalance,CurrentBalance,Currency,Status,PurchaserEmail,RecipientEmail,ExpiresAt,CreatedAt';
  const lines = rows.map((r) =>
    [
      r.code,
      r.initialBalance,
      r.currentBalance,
      r.currency || '',
      r.status || '',
      r.purchaserEmail || '',
      r.recipientEmail || '',
      r.expiresAt || '',
      r.createdAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gift-cards-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET /waitlist — Export waitlist entries as CSV ─────────
dataExportRoutes.get('/waitlist', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select({
      productName: schema.products.name,
      email: schema.waitlist.email,
      customerName: schema.waitlist.customerName,
      status: schema.waitlist.status,
      notifiedAt: schema.waitlist.notifiedAt,
      createdAt: schema.waitlist.createdAt,
    })
    .from(schema.waitlist)
    .leftJoin(schema.products, eq(schema.waitlist.productId, schema.products.id))
    .orderBy(desc(schema.waitlist.createdAt))
    .all();

  const header = 'ProductName,Email,CustomerName,Status,NotifiedAt,CreatedAt';
  const lines = rows.map((r) =>
    [
      r.productName || '',
      r.email || '',
      r.customerName || '',
      r.status || '',
      r.notifiedAt || '',
      r.createdAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="waitlist-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET /bookings — Export coaching bookings as CSV ───────
dataExportRoutes.get('/bookings', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select({
      customerName: schema.coachingBookings.customerName,
      customerEmail: schema.coachingBookings.customerEmail,
      packageName: schema.coachingBookings.packageName,
      programTitle: schema.coachingPackages.title,
      sessionDate: schema.coachingBookings.sessionDate,
      startTime: schema.coachingBookings.startTime,
      endTime: schema.coachingBookings.endTime,
      status: schema.coachingBookings.status,
      createdAt: schema.coachingBookings.createdAt,
    })
    .from(schema.coachingBookings)
    .leftJoin(
      schema.coachingPackages,
      eq(schema.coachingBookings.coachingPackageId, schema.coachingPackages.id)
    )
    .orderBy(desc(schema.coachingBookings.createdAt))
    .all();

  const header = 'CustomerName,CustomerEmail,ProgramName,Date,StartTime,EndTime,Status,CreatedAt';
  const lines = rows.map((r) =>
    [
      r.customerName || '',
      r.customerEmail || '',
      r.programTitle || r.packageName || '',
      r.sessionDate || '',
      r.startTime || '',
      r.endTime || '',
      r.status || '',
      r.createdAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ─── GET /abandoned-carts — Export abandoned carts as CSV ──
dataExportRoutes.get('/abandoned-carts', async (c) => {
  const db = c.get('db');

  const rows = await db
    .select()
    .from(schema.abandonedCarts)
    .orderBy(desc(schema.abandonedCarts.createdAt))
    .all();

  const header = 'Email,CustomerName,ItemCount,TotalValue,Status,CreatedAt,ReminderSentAt';
  const lines = rows.map((r) =>
    [
      r.email || '',
      r.customerName || '',
      r.itemCount ?? 0,
      r.totalValue || '',
      r.status || '',
      r.createdAt || '',
      r.emailSentAt || '',
    ]
      .map(csvVal)
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="abandoned-carts-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
