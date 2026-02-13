import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, asc, desc } from 'drizzle-orm';
import { db, products } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().default('AUD'),
  category: z.enum(['Earrings', 'Brooches', 'Necklaces']),
  shortDescription: z.string(),
  longDescription: z.string(),
  image: z.string().url(),
  detailImages: z.array(z.string().url()).default([]),
  badge: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  availability: z.string().optional(),
  archived: z.boolean().optional(),
});

// GET all products (public)
// Use ?includeArchived=true to include archived products (for admin)
router.get('/', async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === 'true';

  let result;
  if (includeArchived) {
    result = await db.select().from(products).orderBy(asc(products.displayOrder));
  } else {
    result = await db.select().from(products).where(eq(products.archived, false)).orderBy(asc(products.displayOrder));
  }

  // Transform decimal fields to numbers for API response
  const transformedProducts = result.map(p => ({
    ...p,
    price: parseFloat(p.price),
    rating: p.rating ? parseFloat(p.rating) : null,
  }));

  res.json(transformedProducts);
});

// GET single product (public)
router.get('/:id', async (req: Request, res: Response) => {
  const result = await db.select().from(products).where(eq(products.id, req.params.id));
  const product = result[0];

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Transform decimal fields to numbers
  const transformedProduct = {
    ...product,
    price: parseFloat(product.price),
    rating: product.rating ? parseFloat(product.rating) : null,
  };

  res.json(transformedProduct);
});

// POST create product (protected)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = productSchema.parse(req.body);
  const slug = generateSlug(data.name);

  const now = new Date();
  const result = await db.insert(products).values({
    name: data.name,
    slug,
    price: data.price.toString(),
    currency: data.currency,
    category: data.category,
    shortDescription: data.shortDescription,
    longDescription: data.longDescription,
    image: data.image,
    detailImages: data.detailImages,
    badge: data.badge || null,
    rating: data.rating?.toString() || null,
    reviewCount: data.reviewCount ?? 0,
    availability: data.availability || 'In stock',
    archived: data.archived ?? false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  const product = result[0];
  res.status(201).json({
    ...product,
    price: parseFloat(product.price),
    rating: product.rating ? parseFloat(product.rating) : null,
  });
});

// PUT update product (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = productSchema.partial().parse(req.body);

  // Check if product exists
  const existing = await db.select().from(products).where(eq(products.id, req.params.id));
  if (existing.length === 0) {
    throw new AppError('Product not found', 404);
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
  }
  if (data.price !== undefined) updateData.price = data.price.toString();
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
  if (data.longDescription !== undefined) updateData.longDescription = data.longDescription;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.detailImages !== undefined) updateData.detailImages = data.detailImages;
  if (data.badge !== undefined) updateData.badge = data.badge;
  if (data.rating !== undefined) updateData.rating = data.rating?.toString() || null;
  if (data.reviewCount !== undefined) updateData.reviewCount = data.reviewCount;
  if (data.availability !== undefined) updateData.availability = data.availability;
  if (data.archived !== undefined) updateData.archived = data.archived;

  const result = await db.update(products)
    .set(updateData)
    .where(eq(products.id, req.params.id))
    .returning();

  const product = result[0];
  res.json({
    ...product,
    price: parseFloat(product.price),
    rating: product.rating ? parseFloat(product.rating) : null,
  });
});

// PATCH archive/unarchive product (protected)
router.patch('/:id/archive', authMiddleware, async (req: Request, res: Response) => {
  const { archived } = req.body;

  if (typeof archived !== 'boolean') {
    throw new AppError('archived field must be a boolean', 400);
  }

  // Check if product exists
  const existing = await db.select().from(products).where(eq(products.id, req.params.id));
  if (existing.length === 0) {
    throw new AppError('Product not found', 404);
  }

  const result = await db.update(products)
    .set({
      archived,
      updatedAt: new Date(),
    })
    .where(eq(products.id, req.params.id))
    .returning();

  const product = result[0];
  res.json({
    ...product,
    price: parseFloat(product.price),
    rating: product.rating ? parseFloat(product.rating) : null,
  });
});

// DELETE product (protected)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  // Check if product exists
  const existing = await db.select().from(products).where(eq(products.id, req.params.id));
  if (existing.length === 0) {
    throw new AppError('Product not found', 404);
  }

  await db.delete(products).where(eq(products.id, req.params.id));

  res.json({ message: 'Product deleted' });
});

export default router;
