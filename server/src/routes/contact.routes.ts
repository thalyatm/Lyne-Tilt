import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, contactSubmissions } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { triggerAutomation } from './automations.routes.js';

const router = Router();

// Schema for public contact form submission
const contactSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  email: z.string().email('Valid email is required').max(254, 'Email must be at most 254 characters'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be at most 200 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message must be at most 5000 characters'),
});

// Schema for updating status
const statusUpdateSchema = z.object({
  status: z.enum(['unread', 'read', 'archived']),
});

// PUBLIC: Submit contact form
router.post('/', async (req: Request, res: Response) => {
  const data = contactSubmissionSchema.parse(req.body);
  const now = new Date();

  const result = await db.insert(contactSubmissions).values({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    status: 'unread',
    createdAt: now,
  }).returning();

  // Trigger contact form automation
  try {
    await triggerAutomation('contact_form', data.email, data.name);

    // Also trigger coaching inquiry if subject mentions coaching
    if (data.subject.toLowerCase().includes('coaching')) {
      await triggerAutomation('coaching_inquiry', data.email, data.name);
    }
  } catch (error) {
    console.error('Failed to trigger contact automation:', error);
  }

  res.status(201).json({ message: 'Message sent successfully', id: result[0].id });
});

// ADMIN: Get all contact submissions
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { status } = req.query;

  let result;
  if (status === 'unread' || status === 'read' || status === 'archived') {
    result = await db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.status, status))
      .orderBy(desc(contactSubmissions.createdAt));
  } else {
    result = await db.select().from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt));
  }

  res.json(result);
});

// ADMIN: Get unread count (for sidebar badge)
router.get('/unread-count', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(contactSubmissions)
    .where(eq(contactSubmissions.status, 'unread'));
  res.json({ count: result.length });
});

// ADMIN: Get single submission
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, req.params.id));
  const submission = result[0];
  if (!submission) throw new AppError('Message not found', 404);

  // Auto-mark as read when viewed
  if (submission.status === 'unread') {
    await db.update(contactSubmissions)
      .set({ status: 'read', readAt: new Date() })
      .where(eq(contactSubmissions.id, req.params.id));
    submission.status = 'read';
    submission.readAt = new Date();
  }

  res.json(submission);
});

// ADMIN: Update submission status
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const data = statusUpdateSchema.parse(req.body);

  const existing = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, req.params.id));
  if (existing.length === 0) throw new AppError('Message not found', 404);

  const updateData: Record<string, any> = { status: data.status };
  if (data.status === 'read' && !existing[0].readAt) {
    updateData.readAt = new Date();
  }

  const result = await db.update(contactSubmissions)
    .set(updateData)
    .where(eq(contactSubmissions.id, req.params.id))
    .returning();

  res.json(result[0]);
});

// ADMIN: Bulk update status (for marking multiple as read/archived)
router.patch('/bulk/status', authMiddleware, async (req: Request, res: Response) => {
  const bulkSchema = z.object({
    ids: z.array(z.string()),
    status: z.enum(['unread', 'read', 'archived']),
  });
  const data = bulkSchema.parse(req.body);

  const now = new Date();
  let updated = 0;

  for (const id of data.ids) {
    const existing = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    if (existing.length > 0) {
      const updateData: Record<string, any> = { status: data.status };
      if (data.status === 'read' && !existing[0].readAt) {
        updateData.readAt = now;
      }
      await db.update(contactSubmissions)
        .set(updateData)
        .where(eq(contactSubmissions.id, id));
      updated++;
    }
  }

  res.json({ message: `Updated ${updated} messages`, updated });
});

// ADMIN: Delete submission
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, req.params.id));
  if (existing.length === 0) throw new AppError('Message not found', 404);

  await db.delete(contactSubmissions).where(eq(contactSubmissions.id, req.params.id));

  res.json({ message: 'Message deleted' });
});

// ADMIN: Export to CSV
router.get('/export/csv', authMiddleware, async (req: Request, res: Response) => {
  const submissions = await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));

  // Build CSV
  const headers = ['Date', 'Name', 'Email', 'Subject', 'Message', 'Status'];
  const rows = submissions.map((s) => [
    new Date(s.createdAt).toLocaleDateString(),
    `"${s.name.replace(/"/g, '""')}"`,
    s.email,
    `"${s.subject.replace(/"/g, '""')}"`,
    `"${s.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    s.status,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contact-submissions.csv');
  res.send(csv);
});

export default router;
