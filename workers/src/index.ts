import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';

// Import routes
import { authRoutes } from './routes/auth';
import { customerAuthRoutes } from './routes/customer-auth';
import { productsRoutes } from './routes/products';
import { blogRoutes } from './routes/blog';
import { testimonialsRoutes } from './routes/testimonials';
import { faqsRoutes } from './routes/faqs';
import { settingsRoutes } from './routes/settings';
import { contactRoutes } from './routes/contact';
import { newsletterRoutes } from './routes/newsletter';
import { coachingRoutes } from './routes/coaching';
import { checkoutRoutes } from './routes/checkout';
import { uploadRoutes } from './routes/upload';
import { learnRoutes } from './routes/learn';
import { dashboardRoutes } from './routes/dashboard';
import { wallArtRoutes } from './routes/wallart';
import { trackingRoutes } from './routes/tracking';
import { automationsRoutes } from './routes/automations';
import { emailSettingsRoutes } from './routes/email-settings';
import { segmentsRoutes } from './routes/segments';
import { templatesRoutes } from './routes/templates';
import { analyticsRoutes } from './routes/analytics';
import { cohortsRoutes } from './routes/cohorts';
import { activityRoutes } from './routes/activity';
import { campaignsRoutes } from './routes/campaigns';
import { subscribersRoutes } from './routes/subscribers';
import { feedbackRoutes } from './routes/feedback';
import { promotionsRoutes } from './routes/promotions';
import { ordersRoutes } from './routes/orders';
import { customersRoutes } from './routes/customers';
import { inventoryRoutes } from './routes/inventory';
import { bookingsRoutes } from './routes/bookings';
import { clientsRoutes } from './routes/clients';
import { reviewsRoutes } from './routes/reviews';
import { abandonedCartsRoutes } from './routes/abandoned-carts';
import { giftCardsRoutes } from './routes/gift-cards';
import { waitlistRoutes } from './routes/waitlist';
import { wishlistRoutes } from './routes/wishlist';
import { dataExportRoutes } from './routes/data-export';
import { processScheduledDrafts, processAutomationQueue, processAbandonedCarts } from './utils/scheduled';

// Environment bindings type
export type Bindings = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  FRONTEND_URL: string;
};

// Variables type (for middleware context)
export type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  user?: { id: string; email: string; name: string; role: string };
  customerUser?: { id: string; email: string; firstName: string; lastName: string; emailVerified: boolean };
};

// Create app with typed bindings
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use('*', logger());

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://lyne-tilt.pages.dev',
    ];
    // Allow any *.pages.dev subdomain
    if (origin?.endsWith('.pages.dev')) return origin;
    if (allowedOrigins.includes(origin || '')) return origin;
    return allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize database in context
app.use('*', async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set('db', db);
  await next();
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/customer', customerAuthRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/blog', blogRoutes);
app.route('/api/testimonials', testimonialsRoutes);
app.route('/api/faqs', faqsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/contact', contactRoutes);
app.route('/api/newsletter', newsletterRoutes);
app.route('/api/coaching', coachingRoutes);
app.route('/api/learn', learnRoutes);
app.route('/api/checkout', checkoutRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/wall-art', wallArtRoutes);
app.route('/api/newsletter/track', trackingRoutes);
app.route('/api/automations', automationsRoutes);
app.route('/api/email-settings', emailSettingsRoutes);
app.route('/api/segments', segmentsRoutes);
app.route('/api/templates', templatesRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/cohorts', cohortsRoutes);
app.route('/api/activity', activityRoutes);
app.route('/api/campaigns', campaignsRoutes);
app.route('/api/subscribers', subscribersRoutes);
app.route('/api/feedback', feedbackRoutes);
app.route('/api/promotions', promotionsRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/inventory', inventoryRoutes);
app.route('/api/bookings', bookingsRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/reviews', reviewsRoutes);
app.route('/api/abandoned-carts', abandonedCartsRoutes);
app.route('/api/gift-cards', giftCardsRoutes);
app.route('/api/waitlist', waitlistRoutes);
app.route('/api/wishlist', wishlistRoutes);
app.route('/api/data-export', dataExportRoutes);

// ═══════════════════════════════════════════
// PUBLIC CONTRACT ENDPOINTS (no auth required)
// ═══════════════════════════════════════════

// ─── GET /api/contracts/:token — Public contract view ────────────────
app.get('/api/contracts/:token', async (c) => {
  const db = c.get('db');
  const token = c.req.param('token');

  const contract = await db
    .select()
    .from(schema.coachingContracts)
    .where(eq(schema.coachingContracts.paymentToken, token))
    .get();

  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }

  if (contract.status === 'cancelled') {
    return c.json({ error: 'This contract has been cancelled' }, 410);
  }

  if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
    // Auto-expire
    if (contract.status !== 'expired' && contract.status !== 'paid' && contract.status !== 'agreed') {
      await db
        .update(schema.coachingContracts)
        .set({ status: 'expired', updatedAt: new Date().toISOString() })
        .where(eq(schema.coachingContracts.id, contract.id))
        .run();
    }
    return c.json({ error: 'This contract has expired' }, 410);
  }

  // Mark as viewed if first time
  if (contract.status === 'sent' && !contract.viewedAt) {
    await db
      .update(schema.coachingContracts)
      .set({ status: 'viewed', viewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(schema.coachingContracts.id, contract.id))
      .run();
  }

  // Get client name for display
  const client = await db
    .select({ name: schema.coachingClients.name })
    .from(schema.coachingClients)
    .where(eq(schema.coachingClients.id, contract.clientId))
    .get();

  // Return safe subset (no admin-only fields)
  return c.json({
    title: contract.title,
    description: contract.description,
    amount: contract.amount,
    currency: contract.currency,
    status: contract.status,
    contractTerms: contract.contractTerms,
    paymentInstructions: contract.paymentInstructions,
    stripePaymentLink: contract.stripePaymentLink,
    agreedAt: contract.agreedAt,
    clientName: client?.name || null,
  });
});

// ─── POST /api/contracts/:token/agree — Client agrees to contract ───
app.post('/api/contracts/:token/agree', async (c) => {
  const db = c.get('db');
  const token = c.req.param('token');

  const contract = await db
    .select()
    .from(schema.coachingContracts)
    .where(eq(schema.coachingContracts.paymentToken, token))
    .get();

  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }

  if (contract.status === 'cancelled' || contract.status === 'expired') {
    return c.json({ error: 'This contract is no longer valid' }, 410);
  }

  if (contract.status === 'agreed' || contract.status === 'paid') {
    return c.json({ success: true, alreadyAgreed: true });
  }

  const now = new Date().toISOString();
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  await db
    .update(schema.coachingContracts)
    .set({
      status: 'agreed',
      agreedAt: now,
      agreedIp: ip,
      updatedAt: now,
    })
    .where(eq(schema.coachingContracts.id, contract.id))
    .run();

  return c.json({ success: true });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  const cause = (err as any).cause;
  const message = cause?.message || err.message || 'Internal Server Error';
  return c.json({ error: message }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const db = drizzle(env.DB, { schema });
    ctx.waitUntil(Promise.all([
      processScheduledDrafts(env, db),
      processAutomationQueue(env, db),
      processAbandonedCarts(env, db),
    ]));
  },
};
