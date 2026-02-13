import { Hono } from 'hono';
import { eq, desc, asc, and, or, sql, count, like } from 'drizzle-orm';
import { blogPosts, blogPostVersions, blogPostRedirects, users } from '../db/schema';
import { adminAuth, optionalAdminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const blogRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helpers ────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Auto-publish scheduled posts whose scheduledAt has passed (ISO string comparison) */
async function autoPublishScheduledPosts(db: any) {
  const now = new Date().toISOString();
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

// ─── GET / — List posts with pagination, filter, search ──

blogRoutes.get('/', optionalAdminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  await autoPublishScheduledPosts(db);

  const {
    status,
    q,
    page,
    pageSize,
    sort = 'updatedAt',
    order = 'desc',
    category,
    all: showAll,
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize || '50', 10) || 50));
  const offset = (pageNum - 1) * limit;

  // Build conditions
  const conditions = [];

  // Non-authenticated users only see published posts
  if (!user) {
    conditions.push(eq(blogPosts.status, 'published'));
  } else if (status && ['draft', 'scheduled', 'published', 'archived'].includes(status)) {
    conditions.push(eq(blogPosts.status, status as any));
  }

  // Category filter
  if (category) {
    conditions.push(eq(blogPosts.category, category));
  }

  // Search (SQLite: use LOWER + LIKE instead of ilike)
  if (q && q.trim()) {
    const search = `%${q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${blogPosts.title}) LIKE ${search}`,
        sql`LOWER(${blogPosts.excerpt}) LIKE ${search}`,
        sql`LOWER(${blogPosts.category}) LIKE ${search}`,
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort
  const sortColumn = sort === 'title' ? blogPosts.title
    : sort === 'publishedAt' ? blogPosts.publishedAt
    : sort === 'createdAt' ? blogPosts.createdAt
    : sort === 'date' ? blogPosts.date
    : blogPosts.updatedAt;
  const orderFn = order === 'asc' ? asc : desc;

  const [postsResult, countResult] = await Promise.all([
    db.select()
      .from(blogPosts)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)
      .all(),
    db.select({ total: count() })
      .from(blogPosts)
      .where(whereClause)
      .get(),
  ]);

  const total = countResult?.total ?? 0;

  // Backward compat: if no pagination params and no showAll, return flat array
  if (!page && !pageSize && !showAll) {
    return c.json(postsResult);
  }

  return c.json({
    data: postsResult,
    pagination: {
      page: pageNum,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /redirect/:slug — Check slug redirects ────
// Must be before /:idOrSlug to avoid matching

blogRoutes.get('/redirect/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');

  const redirect = await db.select()
    .from(blogPostRedirects)
    .where(eq(blogPostRedirects.fromSlug, slug))
    .get();

  if (!redirect) {
    return c.json({ error: 'No redirect found' }, 404);
  }

  return c.json({ toSlug: redirect.toSlug });
});

// ─── GET /:idOrSlug — Get single post by ID or slug ─────

blogRoutes.get('/:idOrSlug', optionalAdminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const idOrSlug = c.req.param('idOrSlug');

  await autoPublishScheduledPosts(db);

  // Try by ID first, then by slug
  let post = await db.select().from(blogPosts).where(eq(blogPosts.id, idOrSlug)).get();
  if (!post) {
    post = await db.select().from(blogPosts).where(eq(blogPosts.slug, idOrSlug)).get();
  }

  if (!post) {
    // Check slug redirects
    const redirect = await db.select()
      .from(blogPostRedirects)
      .where(eq(blogPostRedirects.fromSlug, idOrSlug))
      .get();
    if (redirect) {
      return c.json({ redirect: redirect.toSlug }, 301);
    }
    return c.json({ error: 'Blog post not found' }, 404);
  }

  // Non-authenticated users can only see published posts
  if (post.status !== 'published' && !user) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  return c.json(post);
});

// ─── POST / — Create post (admin only) ──────────────────

blogRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const body = await c.req.json();

  const slug = body.slug || generateSlug(body.title);
  const now = new Date().toISOString();

  // Determine status (support legacy 'published' boolean)
  let status = body.status || 'draft';
  if (body.published === true && status === 'draft') status = 'published';

  const isPublished = status === 'published';
  const isScheduled = status === 'scheduled' && body.scheduledAt;

  // Resolve author name
  let authorName = body.authorName || null;
  if (!authorName && user?.id) {
    const author = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id)).get();
    authorName = author?.name || null;
  }

  const post = await db.insert(blogPosts).values({
    title: body.title,
    slug,
    excerpt: body.excerpt || '',
    content: body.content || '',
    contentJson: body.contentJson || null,
    date: body.date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    category: body.category || '',
    image: body.image || '',
    status,
    published: isPublished,
    publishedAt: isPublished ? now : null,
    scheduledAt: isScheduled ? body.scheduledAt : null,
    authorId: user?.id,
    authorName,
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    ogImageUrl: body.ogImageUrl || null,
    canonicalUrl: body.canonicalUrl || null,
  }).returning().get();

  return c.json(post, 201);
});

// ─── PUT /:id — Update post (admin only) ────────────────

blogRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = { updatedAt: now };

  // Handle slug change — create redirect if post was ever published
  if (body.slug !== undefined && body.slug && body.slug !== existing.slug) {
    if (existing.status === 'published' || existing.publishedAt) {
      // Upsert redirect
      const existingRedirect = await db.select()
        .from(blogPostRedirects)
        .where(eq(blogPostRedirects.fromSlug, existing.slug))
        .get();

      if (existingRedirect) {
        await db.update(blogPostRedirects)
          .set({ toSlug: body.slug })
          .where(eq(blogPostRedirects.fromSlug, existing.slug));
      } else {
        await db.insert(blogPostRedirects).values({
          fromSlug: existing.slug,
          toSlug: body.slug,
          postId: existing.id,
        });
      }
    }
    updateData.slug = body.slug;
  }

  if (body.title !== undefined) {
    updateData.title = body.title;
    // Auto-generate slug for drafts that haven't been published
    if (!body.slug && existing.status === 'draft' && !existing.publishedAt) {
      updateData.slug = generateSlug(body.title);
    }
  }
  if (body.excerpt !== undefined) updateData.excerpt = body.excerpt;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.contentJson !== undefined) updateData.contentJson = body.contentJson;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.image !== undefined) updateData.image = body.image;
  if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
  if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl;
  if (body.authorName !== undefined) updateData.authorName = body.authorName;

  // Handle status changes
  if (body.status !== undefined) {
    updateData.status = body.status;
    updateData.published = body.status === 'published';

    if (body.status === 'published' && !existing.publishedAt) {
      updateData.publishedAt = now;
    }
    if (body.status === 'scheduled' && body.scheduledAt) {
      updateData.scheduledAt = body.scheduledAt;
    }
    if (body.status === 'draft' || body.status === 'archived') {
      updateData.scheduledAt = null;
    }
  }
  // Backward compat: support legacy 'published' boolean
  else if (body.published !== undefined) {
    updateData.published = body.published;
    updateData.status = body.published ? 'published' : 'draft';
    if (body.published && !existing.publishedAt) {
      updateData.publishedAt = now;
    }
  }

  const post = await db.update(blogPosts)
    .set(updateData)
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// ─── POST /:id/publish — Publish a post ─────────────────

blogRoutes.post('/:id/publish', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const now = new Date().toISOString();
  const post = await db.update(blogPosts)
    .set({
      status: 'published',
      published: true,
      publishedAt: existing.publishedAt || now,
      scheduledAt: null,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  // Create a version snapshot on publish
  await db.insert(blogPostVersions).values({
    postId: id,
    title: post.title,
    content: post.content,
    contentJson: post.contentJson || null,
    excerpt: post.excerpt || '',
    createdBy: user?.id || null,
  });

  return c.json(post);
});

// ─── POST /:id/unpublish — Unpublish (back to draft) ────

blogRoutes.post('/:id/unpublish', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const post = await db.update(blogPosts)
    .set({
      status: 'draft',
      published: false,
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// ─── POST /:id/schedule — Schedule a post ───────────────

blogRoutes.post('/:id/schedule', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!body.scheduledAt) {
    return c.json({ error: 'scheduledAt is required' }, 400);
  }

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const scheduleDate = new Date(body.scheduledAt);
  if (scheduleDate <= new Date()) {
    return c.json({ error: 'Scheduled date must be in the future' }, 400);
  }

  const post = await db.update(blogPosts)
    .set({
      status: 'scheduled',
      published: false,
      scheduledAt: body.scheduledAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// ─── POST /:id/archive — Archive a post ─────────────────

blogRoutes.post('/:id/archive', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const post = await db.update(blogPosts)
    .set({
      status: 'archived',
      published: false,
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// ─── POST /:id/duplicate — Duplicate a post ─────────────

blogRoutes.post('/:id/duplicate', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  // Generate unique slug
  let newSlug = `${existing.slug}-copy`;
  let attempt = 0;
  while (true) {
    const slugToTry = attempt === 0 ? newSlug : `${newSlug}-${attempt}`;
    const slugExists = await db.select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slugToTry))
      .get();
    if (!slugExists) {
      newSlug = slugToTry;
      break;
    }
    attempt++;
    if (attempt > 10) {
      newSlug = `${existing.slug}-copy-${Date.now()}`;
      break;
    }
  }

  // Resolve author name
  let authorName = existing.authorName;
  if (!authorName && user?.id) {
    const author = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id)).get();
    authorName = author?.name || null;
  }

  const now = new Date().toISOString();
  const post = await db.insert(blogPosts).values({
    title: `${existing.title} (Copy)`,
    slug: newSlug,
    excerpt: existing.excerpt,
    content: existing.content,
    contentJson: existing.contentJson,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    category: existing.category,
    image: existing.image,
    status: 'draft',
    published: false,
    publishedAt: null,
    scheduledAt: null,
    authorId: user?.id || null,
    authorName,
    metaTitle: existing.metaTitle,
    metaDescription: existing.metaDescription,
    ogImageUrl: existing.ogImageUrl,
    canonicalUrl: null,
  }).returning().get();

  return c.json(post, 201);
});

// ─── PUT /:id/publish — Backward-compat toggle ──────────

blogRoutes.put('/:id/publish', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const now = new Date().toISOString();
  const isCurrentlyPublished = existing.status === 'published';

  if (isCurrentlyPublished) {
    const post = await db.update(blogPosts)
      .set({ status: 'draft', published: false, scheduledAt: null, updatedAt: now })
      .where(eq(blogPosts.id, id))
      .returning()
      .get();
    return c.json(post);
  } else {
    const post = await db.update(blogPosts)
      .set({
        status: 'published',
        published: true,
        publishedAt: existing.publishedAt || now,
        scheduledAt: null,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, id))
      .returning()
      .get();
    return c.json(post);
  }
});

// ─── POST /:id/versions — Create version snapshot ───────

blogRoutes.post('/:id/versions', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));

  const version = await db.insert(blogPostVersions).values({
    postId: id,
    title: body.title || existing.title,
    content: body.content || existing.content,
    contentJson: body.contentJson || existing.contentJson || null,
    excerpt: body.excerpt || existing.excerpt || '',
    createdBy: user?.id || null,
  }).returning().get();

  // Keep only last 50 versions per post
  const allVersions = await db.select({ id: blogPostVersions.id })
    .from(blogPostVersions)
    .where(eq(blogPostVersions.postId, id))
    .orderBy(desc(blogPostVersions.savedAt))
    .all();

  if (allVersions.length > 50) {
    const toDelete = allVersions.slice(50);
    for (const v of toDelete) {
      await db.delete(blogPostVersions).where(eq(blogPostVersions.id, v.id));
    }
  }

  return c.json(version, 201);
});

// ─── GET /:id/versions — Get version history ────────────

blogRoutes.get('/:id/versions', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const versions = await db.select({
    id: blogPostVersions.id,
    title: blogPostVersions.title,
    excerpt: blogPostVersions.excerpt,
    savedAt: blogPostVersions.savedAt,
    createdBy: blogPostVersions.createdBy,
  })
    .from(blogPostVersions)
    .where(eq(blogPostVersions.postId, id))
    .orderBy(desc(blogPostVersions.savedAt))
    .limit(30)
    .all();

  return c.json(versions);
});

// ─── PUT /:id/restore/:versionId — Restore from version ─

blogRoutes.put('/:id/restore/:versionId', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const versionId = c.req.param('versionId');

  const version = await db.select().from(blogPostVersions).where(eq(blogPostVersions.id, versionId)).get();
  if (!version) {
    return c.json({ error: 'Version not found' }, 404);
  }

  const post = await db.update(blogPosts)
    .set({
      title: version.title,
      content: version.content,
      contentJson: version.contentJson,
      excerpt: version.excerpt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// ─── DELETE /:id — Delete post ──────────────────────────

blogRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Blog post not found' }, 404);
  }

  // Clean up redirects pointing to this post
  await db.delete(blogPostRedirects).where(eq(blogPostRedirects.postId, id));
  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  return c.json({ message: 'Blog post deleted' });
});
