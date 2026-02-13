import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
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
  analyticsEvents,
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

  // Validate and build insert rows
  const rows: Array<{
    id: string;
    eventType: string;
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
      eventType: evt.event_type,
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
