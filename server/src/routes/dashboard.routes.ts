import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db, products, blogPosts, coachingPackages, learnItems, testimonials, faqs, subscribers, contactSubmissions, activityLog } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats and activity (admin only)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  // Fetch all data in parallel
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

  // Calculate stats
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

  // Items needing attention
  const needsAttention: Array<{
    type: string;
    title: string;
    description: string;
    link: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  // Unread messages
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

  // Draft blog posts
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

  // Format activity log entries
  let activityFeed = recentActivityLog.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityName: entry.entityName,
    userName: entry.userName,
    createdAt: entry.createdAt,
    details: entry.details,
  }));

  // If no activity log entries, create synthetic entries from recent content
  if (activityFeed.length === 0) {
    const syntheticActivity: typeof activityFeed = [];

    // Recent blog posts
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

    // Recent products
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

    // Recent contact submissions
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

    // Sort by date and take top 10
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

// Get quick stats only (lightweight endpoint for sidebar badges)
router.get('/quick-stats', authMiddleware, async (req: Request, res: Response) => {
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
