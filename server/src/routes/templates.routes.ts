import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../config/database.js';

const router = express.Router();

// All routes are protected with auth middleware
router.use(authMiddleware);

// GET / - List all templates
router.get('/', async (req, res) => {
  try {
    await db.read();
    const templates = db.data?.emailTemplates || [];

    // Sort by isDefault desc, then updatedAt desc
    const sorted = templates.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return b.isDefault ? 1 : -1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    res.json(sorted);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /:id - Get single template
router.get('/:id', async (req, res) => {
  try {
    await db.read();
    const template = db.data?.emailTemplates?.find(t => t.id === req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST / - Create template
router.post('/', async (req, res) => {
  try {
    const { name, description, blocks, category, thumbnail } = req.body;

    if (!name || !blocks) {
      return res.status(400).json({ error: 'Name and blocks are required' });
    }

    await db.read();

    const newTemplate = {
      id: uuidv4(),
      name,
      description,
      blocks,
      category: category || 'General',
      thumbnail,
      isDefault: false,
      createdBy: req.user?.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.data) {
      db.data = { ...db.data } as any;
      db.data.emailTemplates = [];
    }
    if (!db.data.emailTemplates) {
      db.data.emailTemplates = [];
    }

    db.data.emailTemplates.push(newTemplate);
    await db.write();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { name, description, blocks, category, thumbnail } = req.body;

    await db.read();

    const templateIndex = db.data?.emailTemplates?.findIndex(t => t.id === req.params.id);

    if (templateIndex === undefined || templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = db.data!.emailTemplates![templateIndex];

    // Update fields but preserve isDefault
    const updatedTemplate = {
      ...template,
      name: name !== undefined ? name : template.name,
      description: description !== undefined ? description : template.description,
      blocks: blocks !== undefined ? blocks : template.blocks,
      category: category !== undefined ? category : template.category,
      thumbnail: thumbnail !== undefined ? thumbnail : template.thumbnail,
      updatedAt: new Date().toISOString(),
    };

    db.data!.emailTemplates![templateIndex] = updatedTemplate;
    await db.write();

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    await db.read();

    const template = db.data?.emailTemplates?.find(t => t.id === req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default templates' });
    }

    db.data!.emailTemplates = db.data!.emailTemplates!.filter(t => t.id !== req.params.id);
    await db.write();

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /:id/duplicate - Duplicate template
router.post('/:id/duplicate', async (req, res) => {
  try {
    await db.read();

    const template = db.data?.emailTemplates?.find(t => t.id === req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const duplicatedTemplate = {
      id: uuidv4(),
      name: `${template.name} (Copy)`,
      description: template.description,
      blocks: JSON.parse(JSON.stringify(template.blocks)), // Deep copy blocks
      category: template.category,
      thumbnail: template.thumbnail,
      isDefault: false,
      createdBy: req.user?.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data!.emailTemplates!.push(duplicatedTemplate);
    await db.write();

    res.status(201).json(duplicatedTemplate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// POST /seed - Seed default templates
router.post('/seed', async (req, res) => {
  try {
    await db.read();

    // Check if any default templates already exist
    const hasDefaults = db.data?.emailTemplates?.some(t => t.isDefault);

    if (hasDefaults) {
      return res.status(400).json({ error: 'Default templates already exist' });
    }

    const defaultTemplates = [
      {
        name: 'Product Launch',
        description: 'Announce a new product with hero image and CTA',
        category: 'Marketing',
        blocks: [
          { type: 'image', content: '', alt: 'Product hero image' },
          { type: 'heading', content: 'Introducing Our Latest Creation' },
          { type: 'text', content: 'We are thrilled to share our newest piece with you. Each creation is handcrafted with care and intention.' },
          { type: 'button', content: 'Shop Now', url: '/shop' },
        ],
      },
      {
        name: 'Weekly Digest',
        description: 'Curated weekly content roundup',
        category: 'Newsletter',
        blocks: [
          { type: 'heading', content: 'This Week at Lyne Tilt' },
          { type: 'text', content: 'Here is what has been happening this week — from new creations to upcoming workshops.' },
          { type: 'divider' },
          { type: 'heading', content: 'Featured This Week', level: 2 },
          { type: 'text', content: 'Add your featured content here.' },
          { type: 'divider' },
          { type: 'text', content: 'Until next time,' },
        ],
      },
      {
        name: 'Coaching Update',
        description: 'Share coaching insights and availability',
        category: 'Coaching',
        blocks: [
          { type: 'heading', content: 'A Note on the Creative Journey' },
          { type: 'text', content: 'I wanted to share some reflections from recent coaching sessions and what I have been learning alongside my clients.' },
          { type: 'divider' },
          { type: 'heading', content: 'Upcoming Availability', level: 2 },
          { type: 'text', content: 'I have a few spots opening up for one-on-one coaching. If you have been thinking about exploring your creative practice more deeply, now is a lovely time.' },
          { type: 'button', content: 'Learn About Coaching', url: '/coaching' },
        ],
      },
      {
        name: 'Announcement',
        description: 'General announcement or news',
        category: 'General',
        blocks: [
          { type: 'heading', content: 'An Update From Lyne Tilt' },
          { type: 'text', content: 'We have some exciting news to share with you.' },
          { type: 'divider' },
          { type: 'text', content: 'Add your announcement details here.' },
        ],
      },
      {
        name: 'Blank',
        description: 'Start from scratch',
        category: 'General',
        blocks: [],
      },
    ];

    if (!db.data) {
      db.data = { ...db.data } as any;
      db.data.emailTemplates = [];
    }
    if (!db.data.emailTemplates) {
      db.data.emailTemplates = [];
    }

    const now = new Date().toISOString();
    const createdTemplates = defaultTemplates.map(template => ({
      id: uuidv4(),
      ...template,
      isDefault: true,
      createdBy: req.user?.userId,
      createdAt: now,
      updatedAt: now,
    }));

    db.data.emailTemplates.push(...createdTemplates);
    await db.write();

    res.status(201).json({
      message: 'Default templates seeded successfully',
      templates: createdTemplates,
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    res.status(500).json({ error: 'Failed to seed templates' });
  }
});

export default router;
