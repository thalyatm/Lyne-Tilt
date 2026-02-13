import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, asc, and } from 'drizzle-orm';
import { db, faqs } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.enum(['Shop', 'Coaching', 'Learn', 'General']),
  displayOrder: z.number().int().default(0),
});

router.get('/', async (req: Request, res: Response) => {
  const { category } = req.query;

  let result;
  if (category === 'Shop' || category === 'Coaching' || category === 'Learn' || category === 'General') {
    result = await db.select().from(faqs)
      .where(and(eq(faqs.category, category), eq(faqs.published, true)))
      .orderBy(asc(faqs.displayOrder));
  } else {
    result = await db.select().from(faqs)
      .where(eq(faqs.published, true))
      .orderBy(asc(faqs.displayOrder));
  }

  res.json(result);
});

// Reorder FAQs - must be before /:id route
router.put('/reorder', authMiddleware, async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids)) {
    throw new AppError('ids must be an array', 400);
  }

  // Update displayOrder for each FAQ based on position in ids array
  for (let i = 0; i < ids.length; i++) {
    await db.update(faqs)
      .set({ displayOrder: i, updatedAt: new Date() })
      .where(eq(faqs.id, ids[i]));
  }

  res.json({ message: 'FAQs reordered' });
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = await db.select().from(faqs).where(eq(faqs.id, req.params.id));
  const faq = result[0];
  if (!faq) throw new AppError('FAQ not found', 404);
  res.json(faq);
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = faqSchema.parse(req.body);
  const now = new Date();

  const result = await db.insert(faqs).values({
    question: data.question,
    answer: data.answer,
    category: data.category,
    displayOrder: data.displayOrder,
    published: true,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(result[0]);
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = faqSchema.partial().parse(req.body);

  const existing = await db.select().from(faqs).where(eq(faqs.id, req.params.id));
  if (existing.length === 0) throw new AppError('FAQ not found', 404);

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.question !== undefined) updateData.question = data.question;
  if (data.answer !== undefined) updateData.answer = data.answer;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const result = await db.update(faqs)
    .set(updateData)
    .where(eq(faqs.id, req.params.id))
    .returning();

  res.json(result[0]);
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(faqs).where(eq(faqs.id, req.params.id));
  if (existing.length === 0) throw new AppError('FAQ not found', 404);

  await db.delete(faqs).where(eq(faqs.id, req.params.id));

  res.json({ message: 'FAQ deleted' });
});

export default router;
