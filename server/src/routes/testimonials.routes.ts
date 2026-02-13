import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, asc, and } from 'drizzle-orm';
import { db, testimonials } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const testimonialSchema = z.object({
  text: z.string().min(1),
  author: z.string().min(1),
  role: z.string(),
  type: z.enum(['shop', 'coaching', 'learn']),
  rating: z.number().int().min(1).max(5).optional(),
  displayOrder: z.number().int().default(0),
});

router.get('/', async (req: Request, res: Response) => {
  const { type } = req.query;

  let result;
  if (type === 'shop' || type === 'coaching' || type === 'learn') {
    result = await db.select().from(testimonials)
      .where(and(eq(testimonials.type, type), eq(testimonials.published, true)))
      .orderBy(asc(testimonials.displayOrder));
  } else {
    result = await db.select().from(testimonials)
      .where(eq(testimonials.published, true))
      .orderBy(asc(testimonials.displayOrder));
  }

  res.json(result);
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id));
  const testimonial = result[0];
  if (!testimonial) throw new AppError('Testimonial not found', 404);
  res.json(testimonial);
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = testimonialSchema.parse(req.body);
  const now = new Date();

  const result = await db.insert(testimonials).values({
    text: data.text,
    author: data.author,
    role: data.role,
    type: data.type,
    rating: data.rating ?? 5,
    displayOrder: data.displayOrder,
    published: true,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = testimonialSchema.partial().parse(req.body);

  const existing = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id));
  if (existing.length === 0) throw new AppError('Testimonial not found', 404);

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.text !== undefined) updateData.text = data.text;
  if (data.author !== undefined) updateData.author = data.author;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const result = await db.update(testimonials)
    .set(updateData)
    .where(eq(testimonials.id, req.params.id))
    .returning();

  res.json(result[0]);
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id));
  if (existing.length === 0) throw new AppError('Testimonial not found', 404);

  await db.delete(testimonials).where(eq(testimonials.id, req.params.id));

  res.json({ message: 'Testimonial deleted' });
});

export default router;
