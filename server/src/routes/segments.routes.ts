import { Router, Request, Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db, subscribers, segments, suppressionList, activityLog } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ HELPERS ============

interface SegmentCondition {
  field: string;
  operator: string;
  value: string | number | string[];
}

interface SegmentRules {
  match: 'all' | 'any';
  conditions: SegmentCondition[];
}

function evaluateCondition(subscriber: any, condition: SegmentCondition): boolean {
  const { field, operator, value } = condition;
  const now = Date.now();

  let fieldValue: any;

  switch (field) {
    case 'source':
      fieldValue = subscriber.source;
      break;
    case 'tags':
      fieldValue = subscriber.tags || [];
      break;
    case 'subscribed_days_ago': {
      const subDate = new Date(subscriber.subscribedAt).getTime();
      fieldValue = Math.floor((now - subDate) / (1000 * 60 * 60 * 24));
      break;
    }
    case 'engagement_score':
      fieldValue = subscriber.engagementScore ?? 0;
      break;
    case 'engagement_level':
      fieldValue = subscriber.engagementLevel ?? 'new';
      break;
    case 'emails_received':
      fieldValue = subscriber.emailsReceived ?? 0;
      break;
    case 'last_emailed_days_ago': {
      if (!subscriber.lastEmailedAt) return operator === 'greater_than'; // never emailed = infinite days ago
      const lastEmailed = new Date(subscriber.lastEmailedAt).getTime();
      fieldValue = Math.floor((now - lastEmailed) / (1000 * 60 * 60 * 24));
      break;
    }
    case 'last_opened_days_ago': {
      if (!subscriber.lastOpenedAt) return operator === 'greater_than'; // never opened = infinite days ago
      const lastOpened = new Date(subscriber.lastOpenedAt).getTime();
      fieldValue = Math.floor((now - lastOpened) / (1000 * 60 * 60 * 24));
      break;
    }
    default:
      return false;
  }

  switch (operator) {
    case 'equals':
      return String(fieldValue) === String(value);
    case 'not_equals':
      return String(fieldValue) !== String(value);
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(String(value));
      }
      return String(fieldValue).includes(String(value));
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(String(value));
      }
      return !String(fieldValue).includes(String(value));
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'in':
      if (Array.isArray(value)) {
        if (Array.isArray(fieldValue)) {
          return value.some(v => fieldValue.includes(v));
        }
        return value.includes(String(fieldValue));
      }
      return false;
    case 'not_in':
      if (Array.isArray(value)) {
        if (Array.isArray(fieldValue)) {
          return !value.some(v => fieldValue.includes(v));
        }
        return !value.includes(String(fieldValue));
      }
      return false;
    default:
      return false;
  }
}

function evaluateSubscriber(subscriber: any, rules: SegmentRules): boolean {
  if (!rules.conditions || rules.conditions.length === 0) return true;

  if (rules.match === 'any') {
    return rules.conditions.some(c => evaluateCondition(subscriber, c));
  }
  // default: 'all'
  return rules.conditions.every(c => evaluateCondition(subscriber, c));
}

async function getMatchingSubscribers(rules: SegmentRules): Promise<any[]> {
  const allSubscribers = await db.select().from(subscribers)
    .where(eq(subscribers.subscribed, true));

  return allSubscribers.filter(sub => evaluateSubscriber(sub, rules));
}

async function logActivity(action: string, entityType: string, entityId: string, entityName: string, req: any, metadata?: any) {
  await db.insert(activityLog).values({
    action: action as any,
    entityType,
    entityId,
    entityName: entityName || '',
    userId: req.user?.userId,
    userName: req.user?.email,
    metadata,
    createdAt: new Date(),
  });
}

// ============ ROUTES ============

// GET all segments
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(segments)
      .orderBy(desc(segments.updatedAt));
    res.json({ segments: result });
  } catch (error: any) {
    console.error('Error listing segments:', error);
    res.status(500).json({ error: 'Failed to list segments' });
  }
});

// GET single segment with fresh subscriber count
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(segments)
      .where(eq(segments.id, req.params.id));

    if (result.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = result[0];
    const rules = segment.rules as SegmentRules;
    const matching = await getMatchingSubscribers(rules);

    // Update cached count
    await db.update(segments)
      .set({ subscriberCount: matching.length, lastCalculatedAt: new Date() })
      .where(eq(segments.id, segment.id));

    res.json({
      ...segment,
      subscriberCount: matching.length,
      lastCalculatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting segment:', error);
    res.status(500).json({ error: 'Failed to get segment' });
  }
});

// POST create segment
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, rules } = req.body;

    if (!name || !rules || !rules.conditions) {
      return res.status(400).json({ error: 'Name and rules are required' });
    }

    // Calculate initial subscriber count
    const matching = await getMatchingSubscribers(rules as SegmentRules);

    const now = new Date();
    const result = await db.insert(segments).values({
      name,
      description: description || null,
      rules,
      subscriberCount: matching.length,
      lastCalculatedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning();

    await logActivity('create', 'segment', result[0].id, name, req, {
      subscriberCount: matching.length,
      conditionCount: rules.conditions.length,
    });

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// PUT update segment
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, rules } = req.body;

    const existing = await db.select().from(segments).where(eq(segments.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rules !== undefined) {
      updateData.rules = rules;
      // Recalculate count
      const matching = await getMatchingSubscribers(rules as SegmentRules);
      updateData.subscriberCount = matching.length;
      updateData.lastCalculatedAt = new Date();
    }

    const result = await db.update(segments)
      .set(updateData)
      .where(eq(segments.id, id))
      .returning();

    await logActivity('update', 'segment', id, result[0].name, req);

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// DELETE segment
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(segments).where(eq(segments.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    await db.delete(segments).where(eq(segments.id, id));
    await logActivity('delete', 'segment', id, existing[0].name, req);

    res.json({ message: 'Segment deleted' });
  } catch (error: any) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// GET preview subscribers matching segment rules
router.get('/:id/preview', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const existing = await db.select().from(segments).where(eq(segments.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const rules = existing[0].rules as SegmentRules;
    const matching = await getMatchingSubscribers(rules);

    const start = (page - 1) * limit;
    const paged = matching.slice(start, start + limit);

    res.json({
      subscribers: paged.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        source: s.source,
        tags: s.tags,
        engagementLevel: s.engagementLevel,
        engagementScore: s.engagementScore,
      })),
      total: matching.length,
      page,
      limit,
      totalPages: Math.ceil(matching.length / limit),
    });
  } catch (error: any) {
    console.error('Error previewing segment:', error);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

// POST evaluate rules (without saving — for live preview in segment builder)
router.post('/evaluate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;

    if (!rules || !rules.conditions) {
      return res.status(400).json({ error: 'Rules are required' });
    }

    const matching = await getMatchingSubscribers(rules as SegmentRules);

    res.json({
      count: matching.length,
      subscribers: matching.slice(0, 10).map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        engagementLevel: s.engagementLevel,
      })),
    });
  } catch (error: any) {
    console.error('Error evaluating segment rules:', error);
    res.status(500).json({ error: 'Failed to evaluate rules' });
  }
});

export default router;
