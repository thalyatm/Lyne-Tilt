import { Hono } from 'hono';
import { eq, desc, and, or, like, isNull, ne, sql, asc } from 'drizzle-orm';
import { products, productMedia, slugRedirects, waitlist } from '../db/schema';
import { logActivity } from '../utils/activityLog';
import { sendEmail } from '../utils/email';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const productsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// HELPERS
// ============================================

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function resolveUniqueSlug(db: any, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const conditions: any[] = [eq(products.slug, slug), isNull(products.deletedAt)];
    if (excludeId) {
      conditions.push(ne(products.id, excludeId));
    }
    const existing = await db.select({ id: products.id }).from(products).where(and(...conditions)).get();
    if (!existing) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

function validateForPublish(product: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!product.name?.trim()) errors.push('Name is required');
  if (!product.price || parseFloat(product.price) <= 0) errors.push('Price must be greater than $0');
  if (!product.category?.trim()) errors.push('Category is required');
  if (!product.shortDescription?.trim()) errors.push('Short description is required');
  if (!product.image?.trim()) errors.push('At least one image is required');
  if (!product.slug?.trim()) errors.push('URL slug is required');

  if (!product.metaDescription) warnings.push('No meta description set (SEO)');
  if (!product.longDescription) warnings.push('Long description is empty');
  if (!product.compareAtPrice) warnings.push('No compare-at price set');

  return { valid: errors.length === 0, errors, warnings };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'scheduled', 'archived'],
  scheduled: ['draft', 'active'],
  active: ['archived', 'discontinued'],
  archived: ['active', 'draft'],
  discontinued: ['archived'],
};


// ============================================
// PUBLIC ENDPOINTS
// ============================================

// GET /api/products - List products (public + admin)
productsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const productType = c.req.query('productType');
  const category = c.req.query('category');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const availability = c.req.query('availability');
  const includeArchived = c.req.query('includeArchived') === 'true';
  const includeDrafts = c.req.query('includeDrafts') === 'true';
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions: any[] = [isNull(products.deletedAt)];

  if (productType) {
    conditions.push(eq(products.productType, productType as any));
  }

  if (category) {
    conditions.push(eq(products.category, category));
  }

  if (status) {
    conditions.push(eq(products.status, status as any));
  } else if (!includeArchived && !includeDrafts) {
    // Public default: only active products
    conditions.push(eq(products.status, 'active'));
  } else if (includeArchived && !includeDrafts) {
    // Admin: active + archived
    conditions.push(or(eq(products.status, 'active'), eq(products.status, 'archived')));
  }
  // If includeDrafts: no status filter (show all non-deleted)

  if (availability) {
    conditions.push(eq(products.availability, availability));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(products.category, searchPattern),
        like(products.tags, searchPattern),
      )
    );
  }

  const where = and(...conditions);

  const [result, countResult] = await Promise.all([
    db.select().from(products).where(where)
      .orderBy(asc(products.displayOrder), desc(products.createdAt))
      .limit(limit).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where).get(),
  ]);

  // Compute stats for admin dashboard tiles (only when admin requests drafts/archived)
  let stats = undefined;
  if (includeDrafts || includeArchived) {
    const baseConditions = [isNull(products.deletedAt)];
    const [
      totalActive,
      totalDraft,
      totalArchived,
      inStockCount,
      soldOutCount,
      byCategory,
      byType,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'active'))).get(),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'draft'))).get(),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'archived'))).get(),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'active'), eq(products.trackInventory, true), sql`${products.quantity} > 0`)).get(),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'active'), eq(products.trackInventory, true), sql`${products.quantity} <= 0`)).get(),
      db.select({ category: products.category, count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'active')))
        .groupBy(products.category).all(),
      db.select({ productType: products.productType, count: sql<number>`count(*)` }).from(products)
        .where(and(...baseConditions, eq(products.status, 'active')))
        .groupBy(products.productType).all(),
    ]);

    stats = {
      active: totalActive?.count ?? 0,
      draft: totalDraft?.count ?? 0,
      archived: totalArchived?.count ?? 0,
      inStock: inStockCount?.count ?? 0,
      soldOut: soldOutCount?.count ?? 0,
      byCategory,
      byType,
    };
  }

  return c.json({
    products: result,
    pagination: {
      page,
      limit,
      total: countResult?.count || 0,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    },
    ...(stats && { stats }),
  });
});

// GET /api/products/redirect/:slug - Check for slug redirect (must be before /:idOrSlug)
productsRoutes.get('/redirect/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');

  const redirect = await db.select().from(slugRedirects)
    .where(eq(slugRedirects.oldSlug, slug)).get();

  if (!redirect) {
    return c.json({ error: 'No redirect found' }, 404);
  }

  return c.json(redirect);
});

// POST /api/products/bulk - Bulk update (admin only) (must be before /:idOrSlug)
productsRoutes.post('/bulk', adminAuth, async (c) => {
  const db = c.get('db');
  const { ids, action, fields } = await c.req.json();
  const user = c.get('user');

  if (!ids?.length) {
    return c.json({ error: 'No product IDs provided' }, 400);
  }

  const results = { updated: 0, failed: 0, errors: [] as string[] };

  for (const id of ids) {
    try {
      if (action === 'archive') {
        await db.update(products).set({
          status: 'archived', archived: true, updatedAt: new Date().toISOString(),
        }).where(and(eq(products.id, id), isNull(products.deletedAt)));
      } else if (action === 'publish') {
        const product = await db.select().from(products).where(eq(products.id, id)).get();
        if (product) {
          const validation = validateForPublish(product);
          if (validation.valid) {
            await db.update(products).set({
              status: 'active', archived: false, updatedAt: new Date().toISOString(),
              publishedAt: product.publishedAt || new Date().toISOString(),
            }).where(eq(products.id, id));
          } else {
            results.failed++;
            results.errors.push(`${product.name}: ${validation.errors.join(', ')}`);
            continue;
          }
        }
      } else if (action === 'draft') {
        await db.update(products).set({
          status: 'draft', archived: false, updatedAt: new Date().toISOString(),
        }).where(and(eq(products.id, id), isNull(products.deletedAt)));
      } else if (action === 'delete') {
        await db.update(products).set({
          deletedAt: new Date().toISOString(), status: 'archived', archived: true,
          updatedAt: new Date().toISOString(),
        }).where(and(eq(products.id, id), ne(products.status, 'active'), isNull(products.deletedAt)));
      } else if (action === 'update' && fields) {
        await db.update(products).set({
          ...fields, updatedAt: new Date().toISOString(),
        }).where(and(eq(products.id, id), isNull(products.deletedAt)));
      }
      results.updated++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${id}: ${err.message}`);
    }
  }

  await logActivity(db, 'update', 'product', {
    id: ids.join(','),
    name: `Bulk ${action} (${ids.length} products)`,
  }, user);

  return c.json(results);
});

// GET /api/products/:idOrSlug - Get single product (public)
productsRoutes.get('/:idOrSlug', async (c) => {
  const db = c.get('db');
  const param = c.req.param('idOrSlug');

  // Try by ID first, then by slug
  let product = await db.select().from(products)
    .where(and(eq(products.id, param), isNull(products.deletedAt)))
    .get();

  if (!product) {
    product = await db.select().from(products)
      .where(and(eq(products.slug, param), isNull(products.deletedAt)))
      .get();
  }

  if (!product) {
    // Check slug redirects
    const redirect = await db.select().from(slugRedirects)
      .where(eq(slugRedirects.oldSlug, param)).get();
    if (redirect) {
      return c.json({ redirect: true, slug: redirect.newSlug, productType: redirect.productType }, 301);
    }
    return c.json({ error: 'Product not found' }, 404);
  }

  // Fetch media for this product
  const media = await db.select().from(productMedia)
    .where(eq(productMedia.productId, product.id))
    .orderBy(asc(productMedia.sortOrder)).all();

  return c.json({ ...product, media });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// POST /api/products - Create product (admin only)
productsRoutes.post('/', adminAuth, async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const user = c.get('user');

  const baseSlug = generateSlug(body.name || 'untitled');
  const slug = await resolveUniqueSlug(db, baseSlug);

  const result = await db.insert(products).values({
    productType: body.productType || 'wearable',
    name: body.name || '',
    slug,
    price: body.price || '0',
    compareAtPrice: body.compareAtPrice || null,
    costPrice: body.costPrice || null,
    currency: body.currency || 'AUD',
    taxable: body.taxable !== false,
    shortDescription: body.shortDescription || '',
    longDescription: body.longDescription || '',
    careDescription: body.careDescription || null,
    category: body.category || '',
    tags: body.tags || [],
    badge: body.badge || null,
    materials: body.materials || [],
    colours: body.colours || [],
    weightGrams: body.weightGrams || null,
    dimensions: body.dimensions || null,
    trackInventory: body.trackInventory !== false,
    quantity: body.quantity ?? 1,
    continueSelling: body.continueSelling || false,
    availability: body.availability || 'In stock',
    image: body.image || '',
    detailImages: body.detailImages || [],
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    status: 'draft',
    displayOrder: body.displayOrder || 0,
  }).returning().get();

  await logActivity(db, 'create', 'product', result, user);

  return c.json(result, 201);
});

// PUT /api/products/:id - Update product (admin only)
productsRoutes.put('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user');

  // Fetch current state for change tracking
  const current = await db.select().from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).get();

  if (!current) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Handle slug changes — always ensure uniqueness
  if (body.slug && body.slug !== current.slug) {
    const uniqueSlug = await resolveUniqueSlug(db, body.slug, id);
    body.slug = uniqueSlug;

    // Create redirect from old slug (only for active/published products)
    if (current.status === 'active') {
      await db.insert(slugRedirects).values({
        oldSlug: current.slug,
        newSlug: uniqueSlug,
        productType: current.productType,
      }).onConflictDoUpdate({
        target: slugRedirects.oldSlug,
        set: { newSlug: uniqueSlug },
      });
    }
  }

  // Lock product type after first publish
  if (body.productType && body.productType !== current.productType && current.publishedAt) {
    delete body.productType;
  }

  // Auto-update availability based on inventory
  if (body.quantity !== undefined && current.trackInventory && !current.continueSelling) {
    if (body.quantity <= 0 && current.availability !== 'Sold out') {
      body.availability = 'Sold out';
    } else if (body.quantity > 0 && current.availability === 'Sold out') {
      body.availability = 'In stock';
    }
  }

  // Build changed fields for audit
  const changedFields: Record<string, { old: unknown; new: unknown }> = {};
  const updateFields: Record<string, any> = { updatedAt: new Date().toISOString() };

  const allowedFields = [
    'name', 'slug', 'productType', 'price', 'compareAtPrice', 'costPrice',
    'currency', 'taxable', 'shortDescription', 'longDescription', 'careDescription', 'category',
    'tags', 'badge', 'materials', 'colours', 'weightGrams', 'dimensions', 'trackInventory', 'quantity',
    'continueSelling', 'availability', 'image', 'detailImages', 'metaTitle',
    'metaDescription', 'ogImage', 'displayOrder',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined && JSON.stringify(body[field]) !== JSON.stringify((current as any)[field])) {
      changedFields[field] = { old: (current as any)[field], new: body[field] };
      updateFields[field] = body[field];
    }
  }

  if (Object.keys(updateFields).length <= 1) {
    // Only updatedAt changed — no real changes
    return c.json(current);
  }

  const result = await db.update(products)
    .set(updateFields)
    .where(eq(products.id, id))
    .returning().get();

  await logActivity(db, 'update', 'product', result, user, changedFields);

  // Auto-notify waitlist when product comes back in stock
  if (body.availability === 'In stock' && current.availability === 'Sold out') {
    const waitingEntries = await db.select().from(waitlist)
      .where(and(eq(waitlist.productId, id), eq(waitlist.status, 'waiting')))
      .all();

    const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';
    for (const entry of waitingEntries) {
      try {
        await sendEmail(c.env, entry.email,
          `${current.name} is back in stock!`,
          `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">Great news!</h1>
            <p style="color: #57534e; font-size: 16px; line-height: 1.6;">${current.name} is back in stock and ready to be yours.</p>
            <a href="${baseUrl}/#/shop/${id}" style="display: inline-block; background: #8d3038; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; margin-top: 16px;">Shop Now</a>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">You received this email because you signed up to be notified.</p>
          </div>`
        );
        await db.update(waitlist)
          .set({ status: 'notified', notifiedAt: new Date().toISOString() })
          .where(eq(waitlist.id, entry.id));
      } catch (err) {
        console.error(`Failed to notify waitlist entry ${entry.id}:`, err);
      }
    }
  }

  return c.json(result);
});

// PATCH /api/products/:id/status - Change product status (admin only)
productsRoutes.patch('/:id/status', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status: newStatus } = await c.req.json();
  const user = c.get('user');

  const current = await db.select().from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).get();

  if (!current) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed?.includes(newStatus)) {
    return c.json({
      error: `Cannot transition from '${current.status}' to '${newStatus}'`,
      allowedTransitions: allowed,
    }, 400);
  }

  // Validate for publish
  if (newStatus === 'active') {
    const validation = validateForPublish(current);
    if (!validation.valid) {
      return c.json({ error: 'Publish validation failed', errors: validation.errors, warnings: validation.warnings }, 400);
    }
  }

  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  // Set published_at on first publish
  if (newStatus === 'active' && !current.publishedAt) {
    updateData.publishedAt = new Date().toISOString();
  }

  // Sync archived field for backward compat
  if (newStatus === 'archived' || newStatus === 'discontinued') {
    updateData.archived = true;
  } else if (newStatus === 'active' || newStatus === 'draft') {
    updateData.archived = false;
  }

  const result = await db.update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning().get();

  const action = newStatus === 'active' ? 'publish'
    : newStatus === 'archived' ? 'archive'
    : newStatus === 'draft' ? 'unpublish'
    : 'update';

  await logActivity(db, action, 'product', result, user, {
    status: { old: current.status, new: newStatus },
  });

  return c.json(result);
});

// DELETE /api/products/:id - Soft delete (admin only)
productsRoutes.delete('/:id', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const current = await db.select().from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).get();

  if (!current) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Active products must be archived first
  if (current.status === 'active') {
    return c.json({ error: 'Cannot delete an active product. Archive it first.' }, 400);
  }

  const result = await db.update(products)
    .set({
      deletedAt: new Date().toISOString(),
      status: 'archived',
      archived: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id))
    .returning().get();

  await logActivity(db, 'delete', 'product', result, user);

  return c.json({ success: true });
});

// POST /api/products/:id/duplicate - Duplicate product (admin only)
productsRoutes.post('/:id/duplicate', adminAuth, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const source = await db.select().from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).get();

  if (!source) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const newName = `${source.name} (Copy)`;
  const baseSlug = generateSlug(newName);
  const slug = await resolveUniqueSlug(db, baseSlug);

  const result = await db.insert(products).values({
    productType: source.productType,
    name: newName,
    slug,
    price: source.price,
    compareAtPrice: source.compareAtPrice,
    costPrice: source.costPrice,
    currency: source.currency,
    taxable: source.taxable,
    shortDescription: source.shortDescription,
    longDescription: source.longDescription,
    careDescription: source.careDescription,
    category: source.category,
    tags: source.tags,
    badge: source.badge,
    materials: source.materials,
    colours: source.colours,
    weightGrams: source.weightGrams,
    dimensions: source.dimensions,
    trackInventory: source.trackInventory,
    quantity: 0,
    continueSelling: source.continueSelling,
    availability: 'In stock',
    image: source.image,
    detailImages: source.detailImages,
    metaTitle: null,
    metaDescription: null,
    status: 'draft',
    displayOrder: source.displayOrder,
  }).returning().get();

  // Duplicate media records
  const sourceMedia = await db.select().from(productMedia)
    .where(eq(productMedia.productId, source.id)).all();

  for (const m of sourceMedia) {
    await db.insert(productMedia).values({
      productId: result.id,
      url: m.url,
      filename: m.filename,
      altText: m.altText,
      width: m.width,
      height: m.height,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      isPrimary: m.isPrimary,
      sortOrder: m.sortOrder,
    });
  }

  await logActivity(db, 'duplicate', 'product', result, user, {
    sourceProductId: { old: null, new: source.id },
  });

  return c.json(result, 201);
});

// ============================================
// MEDIA ENDPOINTS
// ============================================

// GET /api/products/:id/media - List product media
productsRoutes.get('/:id/media', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const media = await db.select().from(productMedia)
    .where(eq(productMedia.productId, id))
    .orderBy(asc(productMedia.sortOrder)).all();

  return c.json(media);
});

// POST /api/products/:id/media - Upload media to product (admin only)
productsRoutes.post('/:id/media', adminAuth, async (c) => {
  const db = c.get('db');
  const bucket = c.env.UPLOADS;
  const id = c.req.param('id');

  // Verify product exists
  const product = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const formData = await c.req.formData();
  const file = (formData.get('image') || formData.get('file')) as File | null;
  const altText = (formData.get('altText') as string) || '';

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Accepted formats: JPG, PNG, WebP' }, 400);
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'Image must be under 10MB' }, 400);
  }

  // Upload to R2
  const ext = file.name.split('.').pop() || '';
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const key = `uploads/${filename}`;

  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  const url = `/api/upload/${filename}`;

  // Check if this is the first image (make it primary)
  const existingMedia = await db.select({ id: productMedia.id }).from(productMedia)
    .where(eq(productMedia.productId, id)).all();
  const isPrimary = existingMedia.length === 0;

  const result = await db.insert(productMedia).values({
    productId: id,
    url,
    filename,
    altText,
    fileSize: file.size,
    mimeType: file.type,
    isPrimary,
    sortOrder: existingMedia.length,
  }).returning().get();

  // Update product's primary image field if this is primary
  if (isPrimary) {
    await db.update(products).set({ image: url, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id));
  }

  return c.json(result, 201);
});

// PUT /api/products/:id/media/:mediaId - Update media (admin only)
productsRoutes.put('/:id/media/:mediaId', adminAuth, async (c) => {
  const db = c.get('db');
  const mediaId = c.req.param('mediaId');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.altText !== undefined) updateData.altText = body.altText;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  // Handle setting as primary
  if (body.isPrimary) {
    const productId = c.req.param('id');
    // Unset current primary
    await db.update(productMedia).set({ isPrimary: false })
      .where(eq(productMedia.productId, productId));
    updateData.isPrimary = true;

    // Get this media's URL to update product.image
    const media = await db.select().from(productMedia).where(eq(productMedia.id, mediaId)).get();
    if (media) {
      await db.update(products).set({ image: media.url, updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId));
    }
  }

  const result = await db.update(productMedia).set(updateData)
    .where(eq(productMedia.id, mediaId))
    .returning().get();

  return c.json(result);
});

// DELETE /api/products/:id/media/:mediaId - Delete media (admin only)
productsRoutes.delete('/:id/media/:mediaId', adminAuth, async (c) => {
  const db = c.get('db');
  const bucket = c.env.UPLOADS;
  const productId = c.req.param('id');
  const mediaId = c.req.param('mediaId');

  const media = await db.select().from(productMedia).where(eq(productMedia.id, mediaId)).get();
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  // Delete from R2
  const r2Key = media.url.replace('/api/upload/', 'uploads/');
  await bucket.delete(r2Key);

  // Delete record
  await db.delete(productMedia).where(eq(productMedia.id, mediaId));

  // If this was primary, promote the next image
  if (media.isPrimary) {
    const next = await db.select().from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(asc(productMedia.sortOrder)).get();

    if (next) {
      await db.update(productMedia).set({ isPrimary: true }).where(eq(productMedia.id, next.id));
      await db.update(products).set({ image: next.url, updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId));
    } else {
      // No more images
      await db.update(products).set({ image: '', updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId));
    }
  }

  return c.json({ success: true });
});

// PUT /api/products/:id/media/reorder - Reorder media (admin only)
productsRoutes.put('/:id/media/reorder', adminAuth, async (c) => {
  const db = c.get('db');
  const productId = c.req.param('id');
  const { mediaIds } = await c.req.json();

  for (let i = 0; i < mediaIds.length; i++) {
    await db.update(productMedia).set({ sortOrder: i })
      .where(eq(productMedia.id, mediaIds[i]));
  }

  // First in order is primary
  if (mediaIds.length > 0) {
    await db.update(productMedia).set({ isPrimary: false })
      .where(eq(productMedia.productId, productId));
    await db.update(productMedia).set({ isPrimary: true })
      .where(eq(productMedia.id, mediaIds[0]));

    const primary = await db.select().from(productMedia)
      .where(eq(productMedia.id, mediaIds[0])).get();
    if (primary) {
      await db.update(products).set({ image: primary.url, updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId));
    }
  }

  return c.json({ success: true });
});
