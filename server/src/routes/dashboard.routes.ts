import { Router, Request, Response } from 'express';
import { eq, desc, gte, and } from 'drizzle-orm';
import {
  db,
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
  emailEvents,
  emailAutomations,
  automationQueue,
  sentEmails,
} from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ───────────────────────────────────────────────

function generateLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function toDay(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

// ─── GET /overview — Comprehensive dashboard payload ───────

router.get('/overview', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all data in parallel (13 queries)
    const [
      recentOrders,
      allSubscribers,
      allCampaigns,
      emailEvents30d,
      allAutomations,
      failedQueueItems,
      allProducts,
      allBlogPosts,
      allCoachingPkgs,
      allLearnItems,
      allContactSubs,
      recentSentEmails,
      recentActivityRows,
    ] = await Promise.all([
      db.select().from(orders).where(gte(orders.createdAt, thirtyDaysAgo)),
      db.select().from(subscribers),
      db.select().from(campaigns),
      db.select().from(emailEvents).where(gte(emailEvents.createdAt, thirtyDaysAgo)),
      db.select().from(emailAutomations),
      db.select().from(automationQueue).where(eq(automationQueue.status, 'failed')),
      db.select().from(products),
      db.select().from(blogPosts),
      db.select().from(coachingPackages),
      db.select().from(learnItems),
      db.select().from(contactSubmissions),
      db.select().from(sentEmails).where(gte(sentEmails.sentAt, thirtyDaysAgo)),
      db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(20),
    ]);

    // ─── KPIs ───

    const revenue30d = recentOrders.reduce(
      (sum, o) => sum + parseFloat(String(o.total) || '0'),
      0,
    );
    const orders30d = recentOrders.length;

    const activeSubscribers = allSubscribers.filter((s) => s.subscribed);
    const subscribersTotal = activeSubscribers.length;

    const newSubs30d = allSubscribers.filter(
      (s) => s.subscribedAt && new Date(s.subscribedAt) >= thirtyDaysAgo,
    ).length;
    const lostSubs30d = allSubscribers.filter(
      (s) => s.unsubscribedAt && new Date(s.unsubscribedAt) >= thirtyDaysAgo,
    ).length;
    const subscribers30dNet = newSubs30d - lostSubs30d;

    // Campaigns that were actually sent in last 30 days
    const sentCampaigns30d = allCampaigns.filter(
      (c) => c.status === 'sent' && c.sentAt && new Date(c.sentAt) >= thirtyDaysAgo,
    );

    const emailsSent30d =
      sentCampaigns30d.reduce((sum, c) => sum + (c.recipientCount || 0), 0) +
      recentSentEmails.reduce((sum, e) => sum + (e.recipientCount || 0), 0);

    const delivered = emailEvents30d.filter((e) => e.eventType === 'delivered').length;
    const opened = emailEvents30d.filter((e) => e.eventType === 'opened').length;
    const clicked = emailEvents30d.filter((e) => e.eventType === 'clicked').length;

    const openRate30d = delivered > 0 ? opened / delivered : 0;
    const clickRate30d = delivered > 0 ? clicked / delivered : 0;

    // ─── Time Series ───

    const days = generateLast30Days();

    // Revenue per day
    const revenueMap = new Map<string, number>();
    recentOrders.forEach((o) => {
      const day = toDay(o.createdAt);
      revenueMap.set(day, (revenueMap.get(day) || 0) + parseFloat(String(o.total) || '0'));
    });

    // Subscribers per day (new signups)
    const subsMap = new Map<string, number>();
    allSubscribers
      .filter((s) => s.subscribedAt && new Date(s.subscribedAt) >= thirtyDaysAgo)
      .forEach((s) => {
        const day = toDay(s.subscribedAt);
        subsMap.set(day, (subsMap.get(day) || 0) + 1);
      });

    // Email sends per day
    const emailMap = new Map<string, number>();
    sentCampaigns30d.forEach((c) => {
      if (c.sentAt) {
        const day = toDay(c.sentAt);
        emailMap.set(day, (emailMap.get(day) || 0) + (c.recipientCount || 0));
      }
    });
    recentSentEmails.forEach((e) => {
      const day = toDay(e.sentAt);
      emailMap.set(day, (emailMap.get(day) || 0) + (e.recipientCount || 0));
    });

    // ─── Content ───

    const draftBlogPosts = allBlogPosts.filter(
      (p) => !p.published || p.status === 'draft',
    );

    const recentlyUpdated = [
      ...allBlogPosts.map((p) => ({
        type: 'blog' as const,
        id: p.id,
        title: p.title,
        updated_at: (p.updatedAt || p.createdAt).toISOString(),
        status: p.status || (p.published ? 'published' : 'draft'),
        href: `/admin/blog`,
      })),
      ...allProducts.map((p) => ({
        type: 'product' as const,
        id: p.id,
        title: p.name,
        updated_at: (p.updatedAt || p.createdAt).toISOString(),
        status: p.archived ? 'archived' : 'active',
        href: `/admin/products/${p.id}`,
      })),
      ...allCampaigns.map((c) => ({
        type: 'campaign' as const,
        id: c.id,
        title: c.subject,
        updated_at: (c.updatedAt || c.createdAt).toISOString(),
        status: c.status,
        href: `/admin/campaigns/${c.id}`,
      })),
      ...allCoachingPkgs.map((c) => ({
        type: 'coaching' as const,
        id: c.id,
        title: c.title,
        updated_at: (c.updatedAt || c.createdAt).toISOString(),
        status: c.archived ? 'archived' : 'active',
        href: `/admin/coaching`,
      })),
      ...allLearnItems.map((l) => ({
        type: 'workshop' as const,
        id: l.id,
        title: l.title,
        updated_at: (l.updatedAt || l.createdAt).toISOString(),
        status: l.archived ? 'archived' : 'active',
        href: `/admin/learn`,
      })),
    ]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8);

    // ─── Marketing ───

    const activeCampaigns = allCampaigns
      .filter((c) => ['draft', 'scheduled', 'sending'].includes(c.status))
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.subject,
        status: c.status,
        updated_at: (c.updatedAt || c.createdAt).toISOString(),
        href: `/admin/campaigns/${c.id}`,
      }));

    const automationsHealth = {
      active: allAutomations.filter((a) => a.status === 'active').length,
      paused: allAutomations.filter((a) => a.status === 'paused').length,
      failing: failedQueueItems.length,
    };

    // ─── Ops / Warnings ───

    const warnings: Array<{
      id: string;
      kind: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
      href: string;
    }> = [];

    // Failing automations
    if (failedQueueItems.length > 0) {
      warnings.push({
        id: 'failing-automations',
        kind: 'automation_failure',
        severity: 'high',
        message: `${failedQueueItems.length} automation email${failedQueueItems.length > 1 ? 's' : ''} failing`,
        href: '/admin/automations/queue',
      });
    }

    // Unread contact messages
    const unreadMessages = allContactSubs.filter((c) => c.status === 'unread');
    if (unreadMessages.length > 0) {
      warnings.push({
        id: 'unread-messages',
        kind: 'unread_messages',
        severity: unreadMessages.length > 5 ? 'high' : 'medium',
        message: `${unreadMessages.length} unread contact message${unreadMessages.length > 1 ? 's' : ''}`,
        href: '/admin/inbox',
      });
    }

    // Subscribers with repeated bounces (deliverability risk)
    const bouncingSubscribers = allSubscribers.filter(
      (s) => s.bounceCount && s.bounceCount > 2,
    );
    if (bouncingSubscribers.length > 0) {
      warnings.push({
        id: 'bouncing-subscribers',
        kind: 'deliverability',
        severity: 'medium',
        message: `${bouncingSubscribers.length} subscriber${bouncingSubscribers.length > 1 ? 's' : ''} with repeated bounces`,
        href: '/admin/subscribers',
      });
    }

    // Stale drafts (untouched > 14 days)
    const staleDrafts = draftBlogPosts.filter((p) => {
      const updated = new Date(p.updatedAt || p.createdAt);
      return (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24) > 14;
    });
    if (staleDrafts.length > 0) {
      warnings.push({
        id: 'stale-drafts',
        kind: 'content',
        severity: 'low',
        message: `${staleDrafts.length} blog draft${staleDrafts.length > 1 ? 's' : ''} unchanged for 2+ weeks`,
        href: '/admin/blog',
      });
    }

    // Failed campaigns
    const failedCampaigns = allCampaigns.filter((c) => c.status === 'failed');
    if (failedCampaigns.length > 0) {
      warnings.push({
        id: 'failed-campaigns',
        kind: 'campaign_failure',
        severity: 'high',
        message: `${failedCampaigns.length} campaign${failedCampaigns.length > 1 ? 's' : ''} failed to send`,
        href: '/admin/campaigns',
      });
    }

    // ─── Build response ───

    res.json({
      kpis: {
        revenue_30d: Math.round(revenue30d * 100) / 100,
        orders_30d: orders30d,
        subscribers_total: subscribersTotal,
        subscribers_30d_net: subscribers30dNet,
        emails_sent_30d: emailsSent30d,
        open_rate_30d: Math.round(openRate30d * 1000) / 1000,
        click_rate_30d: Math.round(clickRate30d * 1000) / 1000,
      },
      timeSeries: {
        revenue_daily_30d: days.map((date) => ({
          date,
          value: Math.round((revenueMap.get(date) || 0) * 100) / 100,
        })),
        subscribers_daily_30d: days.map((date) => ({
          date,
          value: subsMap.get(date) || 0,
        })),
        email_sends_daily_30d: days.map((date) => ({
          date,
          value: emailMap.get(date) || 0,
        })),
      },
      content: {
        drafts_count_by_type: {
          blog: draftBlogPosts.length,
          coaching: allCoachingPkgs.filter((c) => c.archived).length,
          workshops: allLearnItems.filter((l) => l.archived).length,
          products: allProducts.filter((p) => p.archived).length,
        },
        recently_updated: recentlyUpdated,
      },
      marketing: {
        active_campaigns: activeCampaigns,
        automations_health: automationsHealth,
      },
      ops: {
        warnings,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ─── GET / — Legacy dashboard stats (kept for backward compat) ───

router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const [
    allProducts,
    allBlogPosts,
    allCoachingPackages,
    allLearnItems,
    allTestimonials,
    allFaqs,
    allSubscribers,
    allContactSubmissions,
    recentActivityLog,
  ] = await Promise.all([
    db.select().from(products),
    db.select().from(blogPosts),
    db.select().from(coachingPackages),
    db.select().from(learnItems),
    db.select().from(testimonials),
    db.select().from(faqs),
    db.select().from(subscribers).where(eq(subscribers.subscribed, true)),
    db.select().from(contactSubmissions),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(10),
  ]);

  const stats = {
    products: allProducts.length,
    blogPosts: allBlogPosts.length,
    publishedPosts: allBlogPosts.filter((p) => p.published).length,
    draftPosts: allBlogPosts.filter((p) => !p.published).length,
    coachingPackages: allCoachingPackages.length,
    learnItems: allLearnItems.length,
    testimonials: allTestimonials.length,
    faqs: allFaqs.length,
    subscribers: allSubscribers.length,
    unreadMessages: allContactSubmissions.filter((c) => c.status === 'unread').length,
    totalMessages: allContactSubmissions.length,
  };

  const needsAttention: Array<{
    type: string;
    title: string;
    description: string;
    link: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  const unreadMessages = allContactSubmissions.filter((c) => c.status === 'unread');
  if (unreadMessages.length > 0) {
    needsAttention.push({
      type: 'messages',
      title: `${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`,
      description: `Latest from ${unreadMessages[0]?.name || 'Unknown'}`,
      link: '/inbox',
      priority: 'high',
    });
  }

  const draftPosts = allBlogPosts.filter((p) => !p.published);
  if (draftPosts.length > 0) {
    needsAttention.push({
      type: 'drafts',
      title: `${draftPosts.length} draft post${draftPosts.length > 1 ? 's' : ''}`,
      description: 'Unpublished blog content waiting for review',
      link: '/blog',
      priority: 'medium',
    });
  }

  let activityFeed = recentActivityLog.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityName: entry.entityName,
    userName: entry.userName,
    createdAt: entry.createdAt,
    details: entry.details,
  }));

  if (activityFeed.length === 0) {
    const syntheticActivity: typeof activityFeed = [];

    const recentPosts = [...allBlogPosts]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
    recentPosts.forEach((post) => {
      syntheticActivity.push({
        id: `blog-${post.id}`,
        action: 'update',
        entityType: 'Blog Post',
        entityName: post.title,
        userName: 'Admin',
        createdAt: post.updatedAt,
        details: post.published ? 'Published' : 'Draft',
      });
    });

    const recentProducts = [...allProducts]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
    recentProducts.forEach((product) => {
      syntheticActivity.push({
        id: `product-${product.id}`,
        action: 'update',
        entityType: 'Product',
        entityName: product.name,
        userName: 'Admin',
        createdAt: product.updatedAt,
        details: null,
      });
    });

    const recentContacts = [...allContactSubmissions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    recentContacts.forEach((contact) => {
      syntheticActivity.push({
        id: `contact-${contact.id}`,
        action: 'create',
        entityType: 'Message',
        entityName: `From ${contact.name}`,
        userName: contact.name,
        createdAt: contact.createdAt,
        details: contact.subject,
      });
    });

    activityFeed = syntheticActivity
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  res.json({
    stats,
    needsAttention,
    recentActivity: activityFeed,
  });
});

// ─── GET /quick-stats — Lightweight endpoint for sidebar badges ───

router.get('/quick-stats', authMiddleware, async (_req: Request, res: Response) => {
  const [contactResults, blogResults] = await Promise.all([
    db.select().from(contactSubmissions).where(eq(contactSubmissions.status, 'unread')),
    db.select().from(blogPosts).where(eq(blogPosts.published, false)),
  ]);

  res.json({
    unreadMessages: contactResults.length,
    draftPosts: blogResults.length,
  });
});

export default router;
