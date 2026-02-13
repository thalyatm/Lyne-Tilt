import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db, learnItems } from '../db/index.js';
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

const learnSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['ONLINE', 'WORKSHOP']),
  price: z.string(),
  image: z.string().url(),
  description: z.string(),
  displayOrder: z.number().int().default(0),
});

router.get('/', async (req: Request, res: Response) => {
  const items = await db.select().from(learnItems)
    .where(eq(learnItems.archived, false))
    .orderBy(asc(learnItems.displayOrder));
  res.json(items);
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = await db.select().from(learnItems).where(eq(learnItems.id, req.params.id));
  const item = result[0];
  if (!item) throw new AppError('Learn item not found', 404);
  res.json(item);
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = learnSchema.parse(req.body);
  const slug = generateSlug(data.title);
  const now = new Date();

  const result = await db.insert(learnItems).values({
    title: data.title,
    slug,
    type: data.type,
    price: data.price,
    image: data.image,
    description: data.description,
    displayOrder: data.displayOrder,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = learnSchema.partial().parse(req.body);

  const existing = await db.select().from(learnItems).where(eq(learnItems.id, req.params.id));
  if (existing.length === 0) throw new AppError('Learn item not found', 404);

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = generateSlug(data.title);
  }
  if (data.type !== undefined) updateData.type = data.type;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const result = await db.update(learnItems)
    .set(updateData)
    .where(eq(learnItems.id, req.params.id))
    .returning();

  res.json(result[0]);
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(learnItems).where(eq(learnItems.id, req.params.id));
  if (existing.length === 0) throw new AppError('Learn item not found', 404);

  await db.delete(learnItems).where(eq(learnItems.id, req.params.id));

  res.json({ message: 'Learn item deleted' });
});

export default router;
