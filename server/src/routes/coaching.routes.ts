import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db, coachingPackages } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const coachingSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  features: z.array(z.string()),
  ctaText: z.string(),
  image: z.string().url().optional(),
  price: z.string().optional(),
  badge: z.string().optional(),
  displayOrder: z.number().int().default(0),
});

router.get('/', async (req: Request, res: Response) => {
  const packages = await db.select().from(coachingPackages)
    .where(eq(coachingPackages.archived, false))
    .orderBy(asc(coachingPackages.displayOrder));
  res.json(packages);
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = await db.select().from(coachingPackages).where(eq(coachingPackages.id, req.params.id));
  const pkg = result[0];
  if (!pkg) throw new AppError('Coaching package not found', 404);
  res.json(pkg);
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = coachingSchema.parse(req.body);
  const slug = generateSlug(data.title);
  const now = new Date();

  const result = await db.insert(coachingPackages).values({
    title: data.title,
    slug,
    description: data.description,
    features: data.features,
    ctaText: data.ctaText,
    image: data.image || null,
    price: data.price || null,
    badge: data.badge || null,
    displayOrder: data.displayOrder,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = coachingSchema.partial().parse(req.body);

  const existing = await db.select().from(coachingPackages).where(eq(coachingPackages.id, req.params.id));
  if (existing.length === 0) throw new AppError('Coaching package not found', 404);

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = generateSlug(data.title);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.badge !== undefined) updateData.badge = data.badge;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const result = await db.update(coachingPackages)
    .set(updateData)
    .where(eq(coachingPackages.id, req.params.id))
    .returning();

  res.json(result[0]);
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(coachingPackages).where(eq(coachingPackages.id, req.params.id));
  if (existing.length === 0) throw new AppError('Coaching package not found', 404);

  await db.delete(coachingPackages).where(eq(coachingPackages.id, req.params.id));

  res.json({ message: 'Coaching package deleted' });
});

router.put('/reorder', authMiddleware, async (req: Request, res: Response) => {
  const orderSchema = z.array(z.object({ id: z.string(), displayOrder: z.number() }));
  const updates = orderSchema.parse(req.body);

  for (const update of updates) {
    await db.update(coachingPackages)
      .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
      .where(eq(coachingPackages.id, update.id));
  }

  res.json({ message: 'Order updated' });
});

export default router;
