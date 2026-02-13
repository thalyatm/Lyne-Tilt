import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { drizzle } from 'drizzle-orm/d1';
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
import { processScheduledDrafts, processAutomationQueue } from './utils/scheduled';

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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const db = drizzle(env.DB, { schema });
    ctx.waitUntil(Promise.all([
      processScheduledDrafts(env, db),
      processAutomationQueue(env, db),
    ]));
  },
};
