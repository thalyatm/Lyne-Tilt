import { Hono } from 'hono';
import { adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/upload - List all files in R2 (admin only)
uploadRoutes.get('/', adminAuth, async (c) => {
  const bucket = c.env.UPLOADS;

  const listed = await bucket.list({ prefix: 'uploads/' });
  const files = listed.objects.map((obj) => ({
    filename: obj.key.replace('uploads/', ''),
    url: `/api/upload/${obj.key.replace('uploads/', '')}`,
    size: obj.size,
    createdAt: obj.uploaded?.toISOString() || new Date().toISOString(),
    contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
  }));

  // Sort by newest first
  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return c.json(files);
});

// POST /api/upload - Upload file to R2 (admin only)
uploadRoutes.post('/', adminAuth, async (c) => {
  const bucket = c.env.UPLOADS;

  const formData = await c.req.formData();
  // Support both 'file' and 'image' field names
  const file = (formData.get('image') || formData.get('file')) as File | null;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || '';
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const key = `uploads/${filename}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Return a relative URL that can be served through the API
  const url = `/api/upload/${filename}`;

  return c.json({
    url,
    filename,
    size: file.size,
    type: file.type,
  });
});

// GET /api/upload/:key - Get file from R2 (public via separate worker or R2 public access)
uploadRoutes.get('/:key', async (c) => {
  const bucket = c.env.UPLOADS;
  const key = c.req.param('key');

  const object = await bucket.get(`uploads/${key}`);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
});

// DELETE /api/upload/:key - Delete file from R2 (admin only)
uploadRoutes.delete('/:key', adminAuth, async (c) => {
  const bucket = c.env.UPLOADS;
  const key = c.req.param('key');

  await bucket.delete(`uploads/${key}`);

  return c.json({ success: true });
});
