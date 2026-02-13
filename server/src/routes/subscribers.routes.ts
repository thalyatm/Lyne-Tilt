import { Router, Request, Response } from 'express';
import { eq, desc, asc, like, or, and, sql, inArray } from 'drizzle-orm';
import { db, subscribers, subscriberTags, emailEvents, campaigns, suppressionList, importJobs, activityLog, users } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============================================
// HELPERS
// ============================================

async function logActivity(action: string, entityType: string, entityId: string, entityName: string, req: any, metadata?: any) {
  try {
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
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// GET / — List subscribers (paginated, searchable, filterable)
// ============================================

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string) || 'all';
    const source = req.query.source as string;
    const tag = req.query.tag as string;
    const engagement = req.query.engagement as string;
    const sortField = (req.query.sort as string) || 'createdAt';
    const sortOrder = (req.query.order as string) || 'desc';

    // Build WHERE conditions
    const conditions: any[] = [];

    // Status filter
    if (status === 'active') {
      conditions.push(eq(subscribers.subscribed, true));
    } else if (status === 'unsubscribed') {
      conditions.push(eq(subscribers.subscribed, false));
    }

    // Search filter (email or name)
    if (search) {
      conditions.push(
        or(
          like(subscribers.email, `%${search}%`),
          like(subscribers.name, `%${search}%`),
          like(subscribers.firstName, `%${search}%`),
          like(subscribers.lastName, `%${search}%`)
        )
      );
    }

    // Source filter
    if (source) {
      conditions.push(eq(subscribers.source, source));
    }

    // Engagement filter
    if (engagement) {
      conditions.push(eq(subscribers.engagementLevel, engagement));
    }

    // Build the sort order
    const sortColumnMap: Record<string, any> = {
      email: subscribers.email,
      name: subscribers.name,
      source: subscribers.source,
      subscribedAt: subscribers.subscribedAt,
      createdAt: subscribers.createdAt,
      updatedAt: subscribers.updatedAt,
      engagementScore: subscribers.engagementScore,
      engagementLevel: subscribers.engagementLevel,
      emailsReceived: subscribers.emailsReceived,
      lastEmailedAt: subscribers.lastEmailedAt,
      lastOpenedAt: subscribers.lastOpenedAt,
      lastClickedAt: subscribers.lastClickedAt,
    };

    const sortColumn = sortColumnMap[sortField] || subscribers.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(whereClause);
    let total = Number(countResult[0].count);

    // Get paginated results
    let results = await db
      .select()
      .from(subscribers)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    // Tag filter (post-query since tags is jsonb)
    if (tag) {
      // Re-query with tag filter applied in JS, adjust total
      const allFiltered = await db
        .select()
        .from(subscribers)
        .where(whereClause)
        .orderBy(orderBy);

      const tagFiltered = allFiltered.filter(s => {
        const subTags = (s.tags || []) as string[];
        return subTags.includes(tag);
      });

      total = tagFiltered.length;
      results = tagFiltered.slice((page - 1) * limit, page * limit);
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      subscribers: results,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error listing subscribers:', error);
    res.status(500).json({ error: 'Failed to list subscribers' });
  }
});

// ============================================
// GET /tags — Return all tag names
// ============================================

router.get('/tags', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(subscriberTags);
    res.json(result.map(t => t.name));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ============================================
// GET /sources — Return all unique subscriber sources
// ============================================

router.get('/sources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db
      .selectDistinct({ source: subscribers.source })
      .from(subscribers)
      .orderBy(asc(subscribers.source));

    res.json(result.map(r => r.source));
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// ============================================
// GET /export — Export subscribers as CSV
// ============================================

router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const allSubscribers = await db
      .select()
      .from(subscribers)
      .orderBy(desc(subscribers.createdAt));

    // Build CSV
    const headers = 'email,name,firstName,lastName,source,tags,subscribed,subscribedAt,engagementScore,engagementLevel';
    const rows = allSubscribers.map(s => {
      const tagsStr = (s.tags || []).join(';');
      return [
        escapeCsvField(s.email),
        escapeCsvField(s.name || ''),
        escapeCsvField(s.firstName || ''),
        escapeCsvField(s.lastName || ''),
        escapeCsvField(s.source),
        escapeCsvField(tagsStr),
        s.subscribed ? 'true' : 'false',
        s.subscribedAt ? new Date(s.subscribedAt).toISOString() : '',
        s.engagementScore ?? 0,
        escapeCsvField(s.engagementLevel || ''),
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    await logActivity('export', 'subscriber', '', `Exported ${allSubscribers.length} subscribers`, req, {
      count: allSubscribers.length,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================
// GET /import/:jobId — Get import job status
// ============================================

router.get('/import/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const result = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
    if (result.length === 0) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching import job:', error);
    res.status(500).json({ error: 'Failed to fetch import job' });
  }
});

// ============================================
// GET /:id — Get single subscriber profile
// ============================================

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    res.status(500).json({ error: 'Failed to fetch subscriber' });
  }
});

// ============================================
// GET /:id/events — Get subscriber event timeline
// ============================================

router.get('/:id/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Verify subscriber exists
    const subscriber = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (subscriber.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailEvents)
      .where(eq(emailEvents.subscriberId, id));
    const total = Number(countResult[0].count);

    // Get events with campaign subject via left join
    const events = await db
      .select({
        id: emailEvents.id,
        campaignId: emailEvents.campaignId,
        campaignSubject: campaigns.subject,
        eventType: emailEvents.eventType,
        metadata: emailEvents.metadata,
        createdAt: emailEvents.createdAt,
      })
      .from(emailEvents)
      .leftJoin(campaigns, eq(emailEvents.campaignId, campaigns.id))
      .where(eq(emailEvents.subscriberId, id))
      .orderBy(desc(emailEvents.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      events,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching subscriber events:', error);
    res.status(500).json({ error: 'Failed to fetch subscriber events' });
  }
});

// ============================================
// PUT /:id — Update subscriber
// ============================================

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, firstName, lastName, tags } = req.body;

    const existing = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (tags !== undefined) updateData.tags = tags;

    const result = await db
      .update(subscribers)
      .set(updateData)
      .where(eq(subscribers.id, id))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ error: 'Failed to update subscriber' });
  }
});

// ============================================
// DELETE /:id — Delete subscriber
// ============================================

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    // Null-out subscriberId on their email events (keep events for analytics)
    await db
      .update(emailEvents)
      .set({ subscriberId: null })
      .where(eq(emailEvents.subscriberId, id));

    // Delete the subscriber
    await db.delete(subscribers).where(eq(subscribers.id, id));

    await logActivity('delete', 'subscriber', id, existing[0].email, req, {
      email: existing[0].email,
      name: existing[0].name,
    });

    res.json({ message: 'Subscriber deleted' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// ============================================
// POST /bulk-action — Bulk actions on subscribers
// ============================================

router.post('/bulk-action', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ids, action, tag } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!action || !['add_tag', 'remove_tag', 'unsubscribe', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be one of: add_tag, remove_tag, unsubscribe, delete' });
    }

    if ((action === 'add_tag' || action === 'remove_tag') && !tag) {
      return res.status(400).json({ error: 'tag is required for add_tag/remove_tag actions' });
    }

    let affected = 0;

    if (action === 'unsubscribe') {
      const result = await db
        .update(subscribers)
        .set({
          subscribed: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(subscribers.id, ids))
        .returning();

      affected = result.length;
    } else if (action === 'delete') {
      // Null-out event references first
      await db
        .update(emailEvents)
        .set({ subscriberId: null })
        .where(inArray(emailEvents.subscriberId, ids));

      // Delete subscriber records
      const result = await db
        .delete(subscribers)
        .where(inArray(subscribers.id, ids))
        .returning();

      affected = result.length;
    } else if (action === 'add_tag') {
      // Fetch current subscribers to update their tags
      const targets = await db
        .select()
        .from(subscribers)
        .where(inArray(subscribers.id, ids));

      for (const sub of targets) {
        const currentTags = (sub.tags || []) as string[];
        if (!currentTags.includes(tag)) {
          await db
            .update(subscribers)
            .set({ tags: [...currentTags, tag], updatedAt: new Date() })
            .where(eq(subscribers.id, sub.id));
          affected++;
        }
      }
    } else if (action === 'remove_tag') {
      const targets = await db
        .select()
        .from(subscribers)
        .where(inArray(subscribers.id, ids));

      for (const sub of targets) {
        const currentTags = (sub.tags || []) as string[];
        if (currentTags.includes(tag)) {
          await db
            .update(subscribers)
            .set({ tags: currentTags.filter(t => t !== tag), updatedAt: new Date() })
            .where(eq(subscribers.id, sub.id));
          affected++;
        }
      }
    }

    res.json({ affected });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ============================================
// POST /import — Start a CSV import
// ============================================

router.post('/import', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { rows, defaultSource, defaultTags, fileName } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required and must not be empty' });
    }

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const user = req.user;

    // Create the import job record
    const [job] = await db.insert(importJobs).values({
      fileName,
      status: 'validating',
      totalRows: rows.length,
      defaultSource: defaultSource || 'csv_import',
      defaultTags: defaultTags || [],
      importedBy: user?.userId || null,
      createdAt: new Date(),
    }).returning();

    // Gather existing emails and suppressed emails for dedup checks
    const existingSubscribers = await db.select({ email: subscribers.email }).from(subscribers);
    const existingEmails = new Set(existingSubscribers.map(s => s.email.toLowerCase()));

    const suppressedEntries = await db.select({ email: suppressionList.email }).from(suppressionList);
    const suppressedEmails = new Set(suppressedEntries.map(s => s.email.toLowerCase()));

    // Validate and process rows
    let importedCount = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    let skippedSuppressed = 0;
    const errors: { row: number; field: string; message: string }[] = [];
    const toInsert: any[] = [];

    // Track emails within this import to catch intra-batch duplicates
    const seenInBatch = new Set<string>();

    // Update job status to importing
    await db.update(importJobs).set({ status: 'importing' }).where(eq(importJobs.id, job.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = (row.email || '').trim().toLowerCase();

      // Validate email format
      if (!email || !EMAIL_REGEX.test(email)) {
        skippedInvalid++;
        errors.push({ row: i + 1, field: 'email', message: `Invalid email: "${row.email || ''}"` });
        continue;
      }

      // Check suppression list
      if (suppressedEmails.has(email)) {
        skippedSuppressed++;
        errors.push({ row: i + 1, field: 'email', message: `Email is suppressed: "${email}"` });
        continue;
      }

      // Check for duplicates (existing in DB or already seen in this batch)
      if (existingEmails.has(email) || seenInBatch.has(email)) {
        skippedDuplicates++;
        errors.push({ row: i + 1, field: 'email', message: `Duplicate email: "${email}"` });
        continue;
      }

      seenInBatch.add(email);

      // Merge tags: row-level tags + default tags (deduplicated)
      const rowTags = Array.isArray(row.tags) ? row.tags : [];
      const mergedTags = [...new Set([...rowTags, ...(defaultTags || [])])];

      const now = new Date();
      toInsert.push({
        email,
        name: row.name || null,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        source: row.source || defaultSource || 'csv_import',
        tags: mergedTags,
        subscribed: true,
        subscribedAt: now,
        emailsReceived: 0,
        engagementScore: 0,
        engagementLevel: 'new',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Batch insert valid rows
    if (toInsert.length > 0) {
      // Insert in batches of 500 to avoid query size limits
      const BATCH_SIZE = 500;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        await db.insert(subscribers).values(batch);
      }
      importedCount = toInsert.length;
    }

    // Update the import job with results
    const [updatedJob] = await db
      .update(importJobs)
      .set({
        status: 'completed',
        validRows: toInsert.length,
        importedRows: importedCount,
        skippedDuplicates,
        skippedInvalid,
        skippedSuppressed,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      })
      .where(eq(importJobs.id, job.id))
      .returning();

    await logActivity('import', 'subscriber', job.id, fileName, req, {
      totalRows: rows.length,
      imported: importedCount,
      skippedDuplicates,
      skippedInvalid,
      skippedSuppressed,
    });

    res.status(201).json(updatedJob);
  } catch (error) {
    console.error('Error importing subscribers:', error);
    res.status(500).json({ error: 'Failed to import subscribers' });
  }
});

export default router;
