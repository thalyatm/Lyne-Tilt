import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db, EmailAutomation, AutomationStep, AutomationQueueItem } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendEmail } from '../services/email.js';

const router = Router();

const automationStepSchema = z.object({
  id: z.string().optional(),
  delayDays: z.number().min(0).default(0),
  delayHours: z.number().min(0).max(23).default(0),
  subject: z.string().min(1),
  body: z.string().min(1),
  order: z.number().min(0),
});

const automationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(['newsletter_signup', 'purchase', 'coaching_inquiry', 'contact_form', 'manual']),
  status: z.enum(['active', 'paused']).default('paused'),
  steps: z.array(automationStepSchema).min(1),
});

// GET all automations (protected)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  await db.read();
  const automations = db.data?.emailAutomations || [];
  res.json(automations);
});

// GET single automation (protected)
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  await db.read();
  const automation = db.data?.emailAutomations.find((a) => a.id === req.params.id);

  if (!automation) {
    throw new AppError('Automation not found', 404);
  }

  res.json(automation);
});

// POST create automation (protected)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = automationSchema.parse(req.body);
  const now = new Date().toISOString();

  // Ensure steps have IDs
  const steps: AutomationStep[] = data.steps.map((step, index) => ({
    ...step,
    id: step.id || uuidv4(),
    order: index,
  }));

  const automation: EmailAutomation = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    trigger: data.trigger,
    status: data.status,
    steps,
    createdAt: now,
    updatedAt: now,
  };

  await db.read();
  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  db.data.emailAutomations.push(automation);
  await db.write();

  res.status(201).json(automation);
});

// PUT update automation (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = automationSchema.partial().parse(req.body);

  await db.read();
  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  const index = db.data.emailAutomations.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    throw new AppError('Automation not found', 404);
  }

  // Update steps with IDs if provided
  let steps = db.data.emailAutomations[index].steps;
  if (data.steps) {
    steps = data.steps.map((step, idx) => ({
      ...step,
      id: step.id || uuidv4(),
      order: idx,
    }));
  }

  db.data.emailAutomations[index] = {
    ...db.data.emailAutomations[index],
    ...data,
    steps,
    updatedAt: new Date().toISOString(),
  };

  await db.write();
  res.json(db.data.emailAutomations[index]);
});

// PATCH toggle automation status (protected)
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!['active', 'paused'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  await db.read();
  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  const index = db.data.emailAutomations.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    throw new AppError('Automation not found', 404);
  }

  db.data.emailAutomations[index].status = status;
  db.data.emailAutomations[index].updatedAt = new Date().toISOString();

  await db.write();
  res.json(db.data.emailAutomations[index]);
});

// DELETE automation (protected)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  await db.read();

  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  const index = db.data.emailAutomations.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    throw new AppError('Automation not found', 404);
  }

  // Also cancel any pending queue items for this automation
  db.data.automationQueue = db.data.automationQueue.map((item) => {
    if (item.automationId === req.params.id && item.status === 'scheduled') {
      return { ...item, status: 'cancelled' as const };
    }
    return item;
  });

  db.data.emailAutomations.splice(index, 1);
  await db.write();

  res.json({ message: 'Automation deleted' });
});

// GET automation queue (protected)
router.get('/queue/all', authMiddleware, async (req: Request, res: Response) => {
  await db.read();
  const queue = db.data?.automationQueue || [];

  // Sort by scheduled date, most recent first
  const sorted = [...queue].sort((a, b) =>
    new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
  );

  res.json(sorted);
});

// GET automation queue stats (protected)
router.get('/queue/stats', authMiddleware, async (req: Request, res: Response) => {
  await db.read();
  const queue = db.data?.automationQueue || [];

  const stats = {
    scheduled: queue.filter(q => q.status === 'scheduled').length,
    sent: queue.filter(q => q.status === 'sent').length,
    failed: queue.filter(q => q.status === 'failed').length,
    cancelled: queue.filter(q => q.status === 'cancelled').length,
  };

  res.json(stats);
});

// POST manually trigger an automation for a recipient (protected)
router.post('/:id/trigger', authMiddleware, async (req: Request, res: Response) => {
  const { email, name } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  await db.read();
  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  const automation = db.data.emailAutomations.find((a) => a.id === req.params.id);

  if (!automation) {
    throw new AppError('Automation not found', 404);
  }

  // Queue all steps for this automation
  const now = new Date();
  const queueItems: AutomationQueueItem[] = automation.steps.map((step) => {
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + step.delayDays);
    scheduledDate.setHours(scheduledDate.getHours() + step.delayHours);

    return {
      id: uuidv4(),
      automationId: automation.id,
      automationName: automation.name,
      stepId: step.id,
      stepOrder: step.order,
      recipientEmail: email,
      recipientName: name,
      subject: step.subject,
      body: step.body,
      status: 'scheduled' as const,
      scheduledFor: scheduledDate.toISOString(),
      createdAt: now.toISOString(),
    };
  });

  db.data.automationQueue.push(...queueItems);
  await db.write();

  res.json({ message: `Automation queued with ${queueItems.length} emails`, queueItems });
});

// POST process due emails in queue (protected - can be called by cron or manually)
router.post('/queue/process', authMiddleware, async (req: Request, res: Response) => {
  await db.read();
  if (!db.data) {
    throw new AppError('Database error', 500);
  }

  const now = new Date();
  const dueItems = db.data.automationQueue.filter(
    (item) => item.status === 'scheduled' && new Date(item.scheduledFor) <= now
  );

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
  };

  for (const item of dueItems) {
    results.processed++;

    // Replace placeholders in subject and body
    const personalizedSubject = item.subject
      .replace(/{{name}}/g, item.recipientName || 'there')
      .replace(/{{email}}/g, item.recipientEmail);

    const personalizedBody = item.body
      .replace(/{{name}}/g, item.recipientName || 'there')
      .replace(/{{email}}/g, item.recipientEmail);

    try {
      const success = await sendEmail({
        to: item.recipientEmail,
        subject: personalizedSubject,
        html: personalizedBody,
      });

      const itemIndex = db.data.automationQueue.findIndex((q) => q.id === item.id);
      if (itemIndex !== -1) {
        if (success) {
          db.data.automationQueue[itemIndex].status = 'sent';
          db.data.automationQueue[itemIndex].sentAt = now.toISOString();
          results.sent++;
        } else {
          db.data.automationQueue[itemIndex].status = 'failed';
          db.data.automationQueue[itemIndex].error = 'Email send failed';
          results.failed++;
        }
      }
    } catch (error) {
      const itemIndex = db.data.automationQueue.findIndex((q) => q.id === item.id);
      if (itemIndex !== -1) {
        db.data.automationQueue[itemIndex].status = 'failed';
        db.data.automationQueue[itemIndex].error = error instanceof Error ? error.message : 'Unknown error';
        results.failed++;
      }
    }
  }

  await db.write();
  res.json(results);
});

// Helper function to trigger automation (exported for use in other routes)
export async function triggerAutomation(
  trigger: string,
  recipientEmail: string,
  recipientName?: string
) {
  await db.read();
  if (!db.data) return;

  // Find active automations with matching trigger
  const matchingAutomations = db.data.emailAutomations.filter(
    (a) => a.trigger === trigger && a.status === 'active'
  );

  const now = new Date();

  for (const automation of matchingAutomations) {
    const queueItems: AutomationQueueItem[] = automation.steps.map((step) => {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + step.delayDays);
      scheduledDate.setHours(scheduledDate.getHours() + step.delayHours);

      return {
        id: uuidv4(),
        automationId: automation.id,
        automationName: automation.name,
        stepId: step.id,
        stepOrder: step.order,
        recipientEmail,
        recipientName,
        subject: step.subject,
        body: step.body,
        status: 'scheduled' as const,
        scheduledFor: scheduledDate.toISOString(),
        createdAt: now.toISOString(),
      };
    });

    db.data.automationQueue.push(...queueItems);
  }

  await db.write();
}

export default router;
