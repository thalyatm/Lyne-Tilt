import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc, ilike, or, sql, count } from 'drizzle-orm';
import { db, blogPosts, blogPostVersions, blogPostRedirects, users } from '../db/index.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Auto-publish scheduled posts whose scheduledAt has passed */
async function autoPublishScheduledPosts() {
  const now = new Date();
  await db.update(blogPosts)
    .set({
      status: 'published',
      published: true,
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(blogPosts.status, 'scheduled'),
        sql`${blogPosts.scheduledAt} <= ${now}`
      )
    );
}

// ─── Validation Schemas ─────────────────────────────────

const blogCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().optional().default(''),
  content: z.string().optional().default(''),
  contentJson: z.string().optional().nullable(),
  date: z.string().optional().default(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  ),
  category: z.string().optional().default(''),
  image: z.string().optional().default(''),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional().default('draft'),
  scheduledAt: z.string().datetime().optional().nullable(),
  slug: z.string().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  // Backward compat
  published: z.boolean().optional(),
});

const blogUpdateSchema = blogCreateSchema.partial();

// ─── GET /blog — List posts with pagination, filter, search ──

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  // Auto-publish any scheduled posts that are due
  await autoPublishScheduledPosts();

  const {
    status,
    q,
    page = '1',
    pageSize = '50',
    sort = 'updatedAt',
    order = 'desc',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset = (pageNum - 1) * limit;

  // Build conditions
  const conditions = [];

  // Non-authenticated users only see published posts
  if (!req.user) {
    conditions.push(eq(blogPosts.status, 'published'));
  } else if (status && ['draft', 'scheduled', 'published', 'archived'].includes(status)) {
    conditions.push(eq(blogPosts.status, status as any));
  }

  // Search
  if (q && q.trim()) {
    const search = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(blogPosts.title, search),
        ilike(blogPosts.excerpt, search),
        ilike(blogPosts.category, search),
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort
  const sortColumn = sort === 'title' ? blogPosts.title
    : sort === 'publishedAt' ? blogPosts.publishedAt
    : sort === 'createdAt' ? blogPosts.createdAt
    : blogPosts.updatedAt;
  const orderFn = order === 'asc' ? asc : desc;

  const [postsResult, countResult] = await Promise.all([
    db.select()
      .from(blogPosts)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(blogPosts)
      .where(whereClause),
  ]);

  const total = countResult[0]?.total ?? 0;

  // For backward compatibility, if no pagination params were sent, return flat array
  if (!req.query.page && !req.query.pageSize) {
    return res.json(postsResult);
  }

  res.json({
    data: postsResult,
    pagination: {
      page: pageNum,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /blog/redirect/:slug — Check slug redirects ────
// Must be before /:id to avoid matching

router.get('/redirect/:slug', async (req: Request, res: Response) => {
  const redirect = await db.select().from(blogPostRedirects)
    .where(eq(blogPostRedirects.fromSlug, req.params.slug));

  if (redirect.length === 0) {
    return res.status(404).json({ error: 'No redirect found' });
  }

  res.json({ toSlug: redirect[0].toSlug });
});

// ─── GET /blog/:id — Get single post ────────────────────

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  await autoPublishScheduledPosts();

  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  let post = result[0];

  if (!post) {
    // Check slug redirects
    const redirect = await db.select().from(blogPostRedirects)
      .where(eq(blogPostRedirects.fromSlug, req.params.id));
    if (redirect[0]) {
      return res.status(301).json({ redirect: redirect[0].toSlug });
    }
    throw new AppError('Blog post not found', 404);
  }

  // Non-authenticated users can only see published posts
  if (post.status !== 'published' && !req.user) {
    throw new AppError('Blog post not found', 404);
  }

  res.json(post);
});

// ─── POST /blog — Create post ───────────────────────────

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = blogCreateSchema.parse(req.body);
  const slug = data.slug || generateSlug(data.title);
  const now = new Date();

  // Determine status (support legacy 'published' boolean)
  let status = data.status || 'draft';
  if (data.published === true && status === 'draft') status = 'published';

  const isPublished = status === 'published';
  const isScheduled = status === 'scheduled' && data.scheduledAt;

  // Fetch author name
  let authorName = data.authorName;
  if (!authorName && req.user?.userId) {
    const author = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user.userId));
    authorName = author[0]?.name || null;
  }

  const result = await db.insert(blogPosts).values({
    title: data.title,
    slug,
    excerpt: data.excerpt || '',
    content: data.content || '',
    contentJson: data.contentJson || null,
    date: data.date || now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    category: data.category || '',
    image: data.image || '',
    status,
    published: isPublished,
    publishedAt: isPublished ? now : null,
    scheduledAt: isScheduled ? new Date(data.scheduledAt!) : null,
    authorId: req.user?.userId,
    authorName,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    ogImageUrl: data.ogImageUrl || null,
    canonicalUrl: data.canonicalUrl || null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

// ─── PUT /blog/:id — Update post ────────────────────────

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = blogUpdateSchema.parse(req.body);

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const current = existing[0];
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  // Handle slug change — create redirect if post was ever published
  if (data.slug !== undefined && data.slug && data.slug !== current.slug) {
    if (current.status === 'published' || current.publishedAt) {
      await db.insert(blogPostRedirects).values({
        fromSlug: current.slug,
        toSlug: data.slug,
        postId: current.id,
      }).onConflictDoUpdate({
        target: blogPostRedirects.fromSlug,
        set: { toSlug: data.slug },
      });
    }
    updateData.slug = data.slug;
  }

  if (data.title !== undefined) {
    updateData.title = data.title;
    // Only auto-generate slug for new drafts
    if (!data.slug && current.status === 'draft' && !current.publishedAt) {
      updateData.slug = generateSlug(data.title);
    }
  }
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.contentJson !== undefined) updateData.contentJson = data.contentJson;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
  if (data.ogImageUrl !== undefined) updateData.ogImageUrl = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl;
  if (data.authorName !== undefined) updateData.authorName = data.authorName;

  // Handle status changes
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.published = data.status === 'published';

    if (data.status === 'published' && !current.publishedAt) {
      updateData.publishedAt = new Date();
    }
    if (data.status === 'scheduled' && data.scheduledAt) {
      updateData.scheduledAt = new Date(data.scheduledAt);
    }
    if (data.status === 'draft' || data.status === 'archived') {
      updateData.scheduledAt = null;
    }
  }
  // Backward compat: support legacy 'published' boolean
  else if (data.published !== undefined) {
    updateData.published = data.published;
    updateData.status = data.published ? 'published' : 'draft';
    if (data.published && !current.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }

  const result = await db.update(blogPosts)
    .set(updateData)
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ─── POST /blog/:id/publish — Publish a post ────────────

router.post('/:id/publish', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const now = new Date();
  const result = await db.update(blogPosts)
    .set({
      status: 'published',
      published: true,
      publishedAt: existing[0].publishedAt || now,
      scheduledAt: null,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  // Create a version snapshot on publish
  await db.insert(blogPostVersions).values({
    postId: req.params.id,
    title: result[0].title,
    content: result[0].content,
    contentJson: result[0].contentJson,
    excerpt: result[0].excerpt || '',
    createdBy: req.user?.userId,
  });

  res.json(result[0]);
});

// ─── POST /blog/:id/unpublish — Unpublish (back to draft) ──

router.post('/:id/unpublish', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const result = await db.update(blogPosts)
    .set({
      status: 'draft',
      published: false,
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ─── POST /blog/:id/schedule — Schedule a post ──────────

router.post('/:id/schedule', authMiddleware, async (req: Request, res: Response) => {
  const { scheduledAt } = z.object({
    scheduledAt: z.string().datetime(),
  }).parse(req.body);

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate <= new Date()) {
    throw new AppError('Scheduled date must be in the future', 400);
  }

  const result = await db.update(blogPosts)
    .set({
      status: 'scheduled',
      published: false,
      scheduledAt: scheduleDate,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ─── POST /blog/:id/archive — Archive a post ────────────

router.post('/:id/archive', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const result = await db.update(blogPosts)
    .set({
      status: 'archived',
      published: false,
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ─── POST /blog/:id/duplicate — Duplicate a post ────────

router.post('/:id/duplicate', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const source = existing[0];
  const now = new Date();

  // Generate unique slug
  let newSlug = `${source.slug}-copy`;
  let attempt = 0;
  while (true) {
    const slugToTry = attempt === 0 ? newSlug : `${newSlug}-${attempt}`;
    const slugExists = await db.select({ id: blogPosts.id }).from(blogPosts)
      .where(eq(blogPosts.slug, slugToTry));
    if (slugExists.length === 0) {
      newSlug = slugToTry;
      break;
    }
    attempt++;
    if (attempt > 10) {
      newSlug = `${source.slug}-copy-${Date.now()}`;
      break;
    }
  }

  // Fetch author name
  let authorName = source.authorName;
  if (!authorName && req.user?.userId) {
    const author = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user.userId));
    authorName = author[0]?.name || null;
  }

  const result = await db.insert(blogPosts).values({
    title: `${source.title} (Copy)`,
    slug: newSlug,
    excerpt: source.excerpt,
    content: source.content,
    contentJson: source.contentJson,
    date: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    category: source.category,
    image: source.image,
    status: 'draft',
    published: false,
    publishedAt: null,
    scheduledAt: null,
    authorId: req.user?.userId,
    authorName,
    metaTitle: source.metaTitle,
    metaDescription: source.metaDescription,
    ogImageUrl: source.ogImageUrl,
    canonicalUrl: null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

// ─── PUT /blog/:id/publish — Backward compat toggle ─────

router.put('/:id/publish', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const now = new Date();
  const isCurrentlyPublished = existing[0].status === 'published';

  if (isCurrentlyPublished) {
    const result = await db.update(blogPosts)
      .set({ status: 'draft', published: false, scheduledAt: null, updatedAt: now })
      .where(eq(blogPosts.id, req.params.id))
      .returning();
    return res.json(result[0]);
  } else {
    const result = await db.update(blogPosts)
      .set({
        status: 'published',
        published: true,
        publishedAt: existing[0].publishedAt || now,
        scheduledAt: null,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, req.params.id))
      .returning();
    return res.json(result[0]);
  }
});

// ─── POST /blog/:id/versions — Create version snapshot ──

router.post('/:id/versions', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  const { title, content, contentJson, excerpt } = req.body;

  const version = await db.insert(blogPostVersions).values({
    postId: req.params.id,
    title: title || existing[0].title,
    content: content || existing[0].content,
    contentJson: contentJson || existing[0].contentJson || null,
    excerpt: excerpt || existing[0].excerpt || '',
    createdBy: req.user?.userId,
  }).returning();

  // Keep only last 50 versions per post
  const allVersions = await db.select({ id: blogPostVersions.id })
    .from(blogPostVersions)
    .where(eq(blogPostVersions.postId, req.params.id))
    .orderBy(desc(blogPostVersions.savedAt));

  if (allVersions.length > 50) {
    const toDelete = allVersions.slice(50).map(v => v.id);
    for (const vId of toDelete) {
      await db.delete(blogPostVersions).where(eq(blogPostVersions.id, vId));
    }
  }

  res.status(201).json(version[0]);
});

// ─── GET /blog/:id/versions — Get version history ───────

router.get('/:id/versions', authMiddleware, async (req: Request, res: Response) => {
  const versions = await db.select({
    id: blogPostVersions.id,
    title: blogPostVersions.title,
    excerpt: blogPostVersions.excerpt,
    savedAt: blogPostVersions.savedAt,
    createdBy: blogPostVersions.createdBy,
  })
    .from(blogPostVersions)
    .where(eq(blogPostVersions.postId, req.params.id))
    .orderBy(desc(blogPostVersions.savedAt))
    .limit(30);

  res.json(versions);
});

// ─── PUT /blog/:id/restore/:versionId — Restore version ─

router.put('/:id/restore/:versionId', authMiddleware, async (req: Request, res: Response) => {
  const version = await db.select().from(blogPostVersions).where(eq(blogPostVersions.id, req.params.versionId));
  if (version.length === 0) throw new AppError('Version not found', 404);

  const result = await db.update(blogPosts)
    .set({
      title: version[0].title,
      content: version[0].content,
      contentJson: version[0].contentJson,
      excerpt: version[0].excerpt,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ─── DELETE /blog/:id — Delete post ─────────────────────

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id));
  if (existing.length === 0) throw new AppError('Blog post not found', 404);

  // Clean up redirects pointing to this post
  await db.delete(blogPostRedirects).where(eq(blogPostRedirects.postId, req.params.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id));

  res.json({ message: 'Blog post deleted' });
});

export default router;
