import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
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
} from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const dashboardRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
