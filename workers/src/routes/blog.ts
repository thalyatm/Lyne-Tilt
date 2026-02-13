import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { blogPosts } from '../db/schema';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const blogRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/blog - List published posts (public)
blogRoutes.get('/', async (c) => {
  const db = c.get('db');
  const category = c.req.query('category');
  const all = c.req.query('all') === 'true';

  let result;
  if (all) {
    // Admin view - all posts
    result = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt)).all();
  } else if (category) {
    result = await db.select().from(blogPosts)
      .where(and(eq(blogPosts.published, true), eq(blogPosts.category, category)))
      .orderBy(desc(blogPosts.date))
      .all();
  } else {
    result = await db.select().from(blogPosts)
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.date))
      .all();
  }

  return c.json(result);
});

// GET /api/blog/:idOrSlug - Get single post by ID or slug (public)
blogRoutes.get('/:idOrSlug', async (c) => {
  const db = c.get('db');
  const idOrSlug = c.req.param('idOrSlug');

  // Try by ID first, then by slug
  let post = await db.select().from(blogPosts).where(eq(blogPosts.id, idOrSlug)).get();
  if (!post) {
    post = await db.select().from(blogPosts).where(eq(blogPosts.slug, idOrSlug)).get();
  }

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json(post);
});

// POST /api/blog - Create post (admin only)
blogRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const body = await c.req.json();

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const post = await db.insert(blogPosts).values({
    title: body.title,
    slug: slug,
    excerpt: body.excerpt,
    content: body.content,
    date: body.date || new Date().toISOString().split('T')[0],
    category: body.category,
    image: body.image,
    published: body.published || false,
    publishedAt: body.published ? new Date().toISOString() : null,
    authorId: user?.id,
    metaTitle: body.metaTitle,
    metaDescription: body.metaDescription,
  }).returning().get();

  return c.json(post, 201);
});

// PUT /api/blog/:id - Update post (admin only)
blogRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  // Handle publish/unpublish
  if (body.published !== undefined) {
    body.publishedAt = body.published ? new Date().toISOString() : null;
  }

  const post = await db.update(blogPosts)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(blogPosts.id, id))
    .returning()
    .get();

  return c.json(post);
});

// DELETE /api/blog/:id - Delete post (admin only)
blogRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  return c.json({ success: true });
});
