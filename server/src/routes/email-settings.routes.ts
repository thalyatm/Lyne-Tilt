import { Router, Request, Response } from 'express';
import { eq, desc, count } from 'drizzle-orm';
import { db, siteSettings, suppressionList, activityLog } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Activity logging helper
async function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  req: any,
  metadata?: any
) {
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

// Default email settings
const defaultSettings = {
  senderName: 'Lyne Tilt',
  senderEmail: 'hello@lynetilt.com',
  replyTo: 'hello@lynetilt.com',
  footerText: 'You are receiving this because you subscribed to our newsletter.',
};

// GET / - Get email settings
router.get(
  '/',
  authMiddleware,
  requireRole('superadmin'),
  async (req: Request, res: Response) => {
    try {
      const settings = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'email_settings'))
        .limit(1);

      if (settings.length === 0) {
        return res.json(defaultSettings);
      }

      const value = settings[0].value;
      res.json(value);
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  }
);

// PUT / - Update email settings
router.put(
  '/',
  authMiddleware,
  requireRole('superadmin'),
  async (req: Request, res: Response) => {
    try {
      const { senderName, senderEmail, replyTo, footerText } = req.body;

      const updatedSettings = {
        senderName,
        senderEmail,
        replyTo,
        footerText,
      };

      // Upsert email settings
      const existing = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'email_settings'))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(siteSettings)
          .set({
            value: updatedSettings,
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.key, 'email_settings'));
      } else {
        await db.insert(siteSettings).values({
          key: 'email_settings',
          value: updatedSettings,
          updatedAt: new Date(),
        });
      }

      // Log activity
      await logActivity(
        'update',
        'email_settings',
        'email_settings',
        'Email Settings',
        req,
        { updatedSettings }
      );

      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  }
);

// GET /suppression - List suppression entries
router.get(
  '/suppression',
  authMiddleware,
  requireRole('superadmin'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(suppressionList);
      const total = totalResult[0]?.count || 0;

      // Get paginated entries
      const entries = await db
        .select()
        .from(suppressionList)
        .orderBy(desc(suppressionList.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      res.json({
        entries,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      res.status(500).json({ error: 'Failed to fetch suppression list' });
    }
  }
);

// POST /suppression - Add email to suppression list
router.post(
  '/suppression',
  authMiddleware,
  requireRole('superadmin'),
  async (req: Request, res: Response) => {
    try {
      const { email, reason } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check for duplicates
      const existing = await db
        .select()
        .from(suppressionList)
        .where(eq(suppressionList.email, email))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already in suppression list' });
      }

      // Add to suppression list
      const [entry] = await db
        .insert(suppressionList)
        .values({
          email,
          reason: reason || 'manual',
          source: 'admin',
          createdAt: new Date(),
        })
        .returning();

      // Log activity
      await logActivity(
        'create',
        'suppression',
        entry.id,
        email,
        req,
        { reason: reason || 'manual', source: 'admin' }
      );

      res.status(201).json(entry);
    } catch (error) {
      console.error('Error adding to suppression list:', error);
      res.status(500).json({ error: 'Failed to add to suppression list' });
    }
  }
);

// DELETE /suppression/:id - Remove from suppression list
router.delete(
  '/suppression/:id',
  authMiddleware,
  requireRole('superadmin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get the entry before deleting
      const entry = await db
        .select()
        .from(suppressionList)
        .where(eq(suppressionList.id, id))
        .limit(1);

      if (entry.length === 0) {
        return res.status(404).json({ error: 'Suppression entry not found' });
      }

      // Delete the entry
      await db.delete(suppressionList).where(eq(suppressionList.id, id));

      // Log activity
      await logActivity(
        'unsuppress',
        'suppression',
        id,
        entry[0].email,
        req
      );

      res.json({ message: 'Email removed from suppression list' });
    } catch (error) {
      console.error('Error removing from suppression list:', error);
      res.status(500).json({ error: 'Failed to remove from suppression list' });
    }
  }
);

export default router;
