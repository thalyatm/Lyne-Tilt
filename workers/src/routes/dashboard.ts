import { Hono } from 'hono';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import {
  products,
  blogPosts,
  coachingPackages,
  learnItems,
  testimonials,
  faqs,
  subscribers,
  contactSubmissions,
  activityLog,
  orders,
  campaigns,
  sentEmails,
  emailAutomations,
  automationQueue,
} from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const dashboardRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helper: generate last N days as ISO date strings ────
function last30Days(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ─── GET /overview — Full dashboard data ─────────────────

dashboardRoutes.get('/overview', adminAuth, async (c) => {
  const db = c.get('db');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();
  const days = last30Days();

  // ── KPIs ──────────────────────────────────────────────
  const [
    revenueResult,
    ordersResult,
    subscribersTotal,
    subscribersNew,
    emailsSent,
    campaignOpens,
    campaignClicks,
    campaignDelivered,
  ] = await Promise.all([
    // Revenue last 30d
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, cutoff), eq(orders.status, 'confirmed')))
      .get(),
    // Orders last 30d
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(gte(orders.createdAt, cutoff))
      .get(),
    // Total subscribers
    db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .get(),
    // New subscribers last 30d
    db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(and(eq(subscribers.subscribed, true), gte(subscribers.subscribedAt, cutoff)))
      .get(),
    // Emails sent last 30d
    db.select({ total: sql<number>`COALESCE(SUM(${sentEmails.recipientCount}), 0)` })
      .from(sentEmails)
      .where(gte(sentEmails.sentAt, cutoff))
      .get(),
    // Campaign opens (table may not exist yet)
    db.select({ count: sql<number>`count(*)` })
      .from(sql`campaign_events`)
      .where(sql`event_type = 'opened' AND created_at >= ${cutoff}`)
      .get().catch(() => ({ count: 0 })),
    // Campaign clicks
    db.select({ count: sql<number>`count(*)` })
      .from(sql`campaign_events`)
      .where(sql`event_type = 'clicked' AND created_at >= ${cutoff}`)
      .get().catch(() => ({ count: 0 })),
    // Campaign delivered
    db.select({ count: sql<number>`count(*)` })
      .from(sql`campaign_events`)
      .where(sql`event_type = 'delivered' AND created_at >= ${cutoff}`)
      .get().catch(() => ({ count: 0 })),
  ]);

  const delivered = campaignDelivered?.count ?? 0;
  const opens = campaignOpens?.count ?? 0;
  const clicks = campaignClicks?.count ?? 0;

  // ── Time series ───────────────────────────────────────
  const [revDaily, subsDaily, emailsDaily] = await Promise.all([
    // Revenue by day
    db.select({
      date: sql<string>`DATE(${orders.createdAt})`,
      value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS REAL)), 0)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, cutoff), eq(orders.status, 'confirmed')))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .all(),
    // Subscribers by day
    db.select({
      date: sql<string>`DATE(${subscribers.subscribedAt})`,
      value: sql<number>`count(*)`,
    })
      .from(subscribers)
      .where(and(eq(subscribers.subscribed, true), gte(subscribers.subscribedAt, cutoff)))
      .groupBy(sql`DATE(${subscribers.subscribedAt})`)
      .all(),
    // Emails sent by day
    db.select({
      date: sql<string>`DATE(${sentEmails.sentAt})`,
      value: sql<number>`COALESCE(SUM(${sentEmails.recipientCount}), 0)`,
    })
      .from(sentEmails)
      .where(gte(sentEmails.sentAt, cutoff))
      .groupBy(sql`DATE(${sentEmails.sentAt})`)
      .all(),
  ]);

  // Fill in missing days with 0
  function fillDays(rows: { date: string; value: number }[]): { date: string; value: number }[] {
    const map = new Map(rows.map(r => [r.date, r.value]));
    return days.map(d => ({ date: d, value: map.get(d) ?? 0 }));
  }

  // ── Content ───────────────────────────────────────────
  const [draftBlogs, draftProducts, draftCoaching, draftWorkshops, recentlyUpdated] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.status, 'draft')).get(),
    db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, 'draft')).get(),
    db.select({ count: sql<number>`count(*)` }).from(coachingPackages).where(eq(coachingPackages.archived, false)).get(),
    db.select({ count: sql<number>`count(*)` }).from(learnItems).where(eq(learnItems.archived, false)).get(),
    // Recently updated items (union of blog + products)
    db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      updatedAt: blogPosts.updatedAt,
      status: blogPosts.status,
      type: sql<string>`'blog'`,
    })
      .from(blogPosts)
      .orderBy(desc(blogPosts.updatedAt))
      .limit(8)
      .all(),
  ]);

  const recentEntities = recentlyUpdated.map(r => ({
    type: r.type as string,
    id: r.id,
    title: r.title,
    updated_at: r.updatedAt,
    status: r.status,
    href: `/admin/blog`,
  }));

  // ── Marketing ─────────────────────────────────────────
  const [activeCampaigns, autoActive, autoPaused, autoFailing] = await Promise.all([
    db.select({
      id: campaigns.id,
      name: campaigns.subject,
      status: campaigns.status,
      updatedAt: campaigns.updatedAt,
    })
      .from(campaigns)
      .where(sql`${campaigns.status} IN ('sending', 'scheduled')`)
      .orderBy(desc(campaigns.updatedAt))
      .limit(5)
      .all().catch(() => []),
    db.select({ count: sql<number>`count(*)` }).from(emailAutomations).where(eq(emailAutomations.status, 'active')).get().catch(() => ({ count: 0 })),
    db.select({ count: sql<number>`count(*)` }).from(emailAutomations).where(eq(emailAutomations.status, 'paused')).get().catch(() => ({ count: 0 })),
    db.select({ count: sql<number>`count(*)` }).from(automationQueue).where(eq(automationQueue.status, 'failed')).get().catch(() => ({ count: 0 })),
  ]);

  // ── Ops / Warnings ────────────────────────────────────
  const warnings: { id: string; kind: string; severity: string; message: string; href: string }[] = [];

  const unreadMessages = await db.select({ count: sql<number>`count(*)` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, 'unread'))
    .get();

  if ((unreadMessages?.count ?? 0) > 0) {
    warnings.push({
      id: 'unread-messages',
      kind: 'messages',
      severity: 'high',
      message: `${unreadMessages!.count} unread contact message${unreadMessages!.count === 1 ? '' : 's'}`,
      href: '/admin/inbox',
    });
  }

  if ((autoFailing?.count ?? 0) > 0) {
    warnings.push({
      id: 'failing-automations',
      kind: 'automations',
      severity: 'medium',
      message: `${autoFailing!.count} failed automation queue item${autoFailing!.count === 1 ? '' : 's'}`,
      href: '/admin/automations/queue',
    });
  }

  // ── Response ──────────────────────────────────────────
  return c.json({
    kpis: {
      revenue_30d: revenueResult?.total ?? 0,
      orders_30d: ordersResult?.count ?? 0,
      subscribers_total: subscribersTotal?.count ?? 0,
      subscribers_30d_net: subscribersNew?.count ?? 0,
      emails_sent_30d: emailsSent?.total ?? 0,
      open_rate_30d: delivered > 0 ? opens / delivered : 0,
      click_rate_30d: delivered > 0 ? clicks / delivered : 0,
    },
    timeSeries: {
      revenue_daily_30d: fillDays(revDaily),
      subscribers_daily_30d: fillDays(subsDaily),
      email_sends_daily_30d: fillDays(emailsDaily),
    },
    content: {
      drafts_count_by_type: {
        blog: draftBlogs?.count ?? 0,
        products: draftProducts?.count ?? 0,
        coaching: draftCoaching?.count ?? 0,
        workshops: draftWorkshops?.count ?? 0,
      },
      recently_updated: recentEntities,
    },
    marketing: {
      active_campaigns: activeCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        updated_at: c.updatedAt,
        href: `/admin/campaigns/${c.id}`,
      })),
      automations_health: {
        active: autoActive?.count ?? 0,
        paused: autoPaused?.count ?? 0,
        failing: autoFailing?.count ?? 0,
      },
    },
    ops: {
      warnings,
    },
  });
});

// GET / - Dashboard stats (admin only)
dashboardRoutes.get('/', adminAuth, async (c) => {
  const db = c.get('db');

  // Run all count queries in parallel
  const [
    productsCount,
    totalBlogPosts,
    publishedPosts,
    draftPosts,
    coachingCount,
    learnCount,
    testimonialsCount,
    faqsCount,
    subscribersCount,
    unreadMessages,
    totalMessages,
    recentActivity,
  ] = await Promise.all([
    // Non-archived products
    db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.archived, false))
      .get(),

    // Total blog posts
    db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .get(),

    // Published blog posts
    db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.published, true))
      .get(),

    // Draft blog posts
    db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.published, false))
      .get(),

    // Non-archived coaching packages
    db.select({ count: sql<number>`count(*)` })
      .from(coachingPackages)
      .where(eq(coachingPackages.archived, false))
      .get(),

    // Non-archived learn items
    db.select({ count: sql<number>`count(*)` })
      .from(learnItems)
      .where(eq(learnItems.archived, false))
      .get(),

    // Published testimonials
    db.select({ count: sql<number>`count(*)` })
      .from(testimonials)
      .where(eq(testimonials.published, true))
      .get(),

    // Published FAQs
    db.select({ count: sql<number>`count(*)` })
      .from(faqs)
      .where(eq(faqs.published, true))
      .get(),

    // Subscribed subscribers
    db.select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(eq(subscribers.subscribed, true))
      .get(),

    // Unread contact submissions
    db.select({ count: sql<number>`count(*)` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, 'unread'))
      .get(),

    // Total contact submissions
    db.select({ count: sql<number>`count(*)` })
      .from(contactSubmissions)
      .get(),

    // Recent activity (last 10 entries)
    db.select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(10)
      .all(),
  ]);

  const stats = {
    products: productsCount?.count ?? 0,
    blogPosts: totalBlogPosts?.count ?? 0,
    publishedPosts: publishedPosts?.count ?? 0,
    draftPosts: draftPosts?.count ?? 0,
    coachingPackages: coachingCount?.count ?? 0,
    learnItems: learnCount?.count ?? 0,
    testimonials: testimonialsCount?.count ?? 0,
    faqs: faqsCount?.count ?? 0,
    subscribers: subscribersCount?.count ?? 0,
    unreadMessages: unreadMessages?.count ?? 0,
    totalMessages: totalMessages?.count ?? 0,
  };

  // Build needs-attention items
  const needsAttention: Array<{
    type: string;
    title: string;
    description: string;
    link: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  if (stats.unreadMessages > 0) {
    needsAttention.push({
      type: 'messages',
      title: 'Unread messages',
      description: `You have ${stats.unreadMessages} unread message${stats.unreadMessages === 1 ? '' : 's'}`,
      link: '/admin/inbox',
      priority: 'high',
    });
  }

  if (stats.draftPosts > 0) {
    needsAttention.push({
      type: 'blog',
      title: 'Blog drafts',
      description: `You have ${stats.draftPosts} unpublished blog draft${stats.draftPosts === 1 ? '' : 's'}`,
      link: '/admin/blog',
      priority: 'medium',
    });
  }

  return c.json({
    stats,
    needsAttention,
    recentActivity,
  });
});
