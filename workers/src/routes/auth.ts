import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { users, refreshTokens } from '../db/schema';
import { signJwt, verifyJwt, adminAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/auth/login - Admin login
authRoutes.post('/login', async (c) => {
  const db = c.get('db');
  const { email, password } = await c.req.json();

  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Generate tokens
  const accessToken = await signJwt(
    { sub: user.id, email: user.email, type: 'admin', role: user.role },
    c.env.JWT_SECRET,
    '15m'
  );

  const refreshTokenValue = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: expiresAt,
  });

  return c.json({
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// POST /api/auth/refresh - Refresh access token
authRoutes.post('/refresh', async (c) => {
  const db = c.get('db');
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  // Find refresh token
  const tokenRecord = await db.select().from(refreshTokens).where(eq(refreshTokens.token, refreshToken)).get();

  if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  // Get user
  const user = await db.select().from(users).where(eq(users.id, tokenRecord.userId)).get();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Generate new access token
  const accessToken = await signJwt(
    { sub: user.id, email: user.email, type: 'admin', role: user.role },
    c.env.JWT_SECRET,
    '15m'
  );

  return c.json({ accessToken });
});

// POST /api/auth/logout - Logout (revoke refresh token)
authRoutes.post('/logout', async (c) => {
  const db = c.get('db');
  const { refreshToken } = await c.req.json();

  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }

  return c.json({ success: true });
});

// GET /api/auth/me - Get current user
authRoutes.get('/me', adminAuth, async (c) => {
  const user = c.get('user');
  return c.json(user);
});

// POST /api/auth/setup - Initial admin setup (only works if no admins exist)
authRoutes.post('/setup', async (c) => {
  const db = c.get('db');

  // Check if any admin exists
  const existingAdmin = await db.select().from(users).get();
  if (existingAdmin) {
    return c.json({ error: 'Admin already exists' }, 400);
  }

  const { email, password, name } = await c.req.json();

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create admin
  const admin = await db.insert(users).values({
    email,
    passwordHash,
    name,
    role: 'superadmin',
  }).returning().get();

  return c.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  }, 201);
});
