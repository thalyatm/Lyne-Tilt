import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { customerUsers, customerRefreshTokens } from '../db/schema';
import { signJwt, customerAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../index';

export const customerAuthRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/customer/register
customerAuthRoutes.post('/register', async (c) => {
  const db = c.get('db');
  const { firstName, lastName, email, password } = await c.req.json();

  // Check if user exists
  const existing = await db.select().from(customerUsers).where(eq(customerUsers.email, email)).get();
  if (existing) {
    return c.json({ error: 'Email already registered' }, 400);
  }

  // Validate password
  if (password.length < 10) {
    return c.json({ error: 'Password must be at least 10 characters' }, 400);
  }

  const passwordHash = await hash(password, 12);
  const verificationToken = crypto.randomUUID();
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const user = await db.insert(customerUsers).values({
    firstName,
    lastName,
    email,
    passwordHash,
    verificationToken,
    verificationTokenExpiry,
    emailVerified: false,
  }).returning().get();

  // TODO: Send verification email via Resend

  return c.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  }, 201);
});

// POST /api/customer/login
customerAuthRoutes.post('/login', async (c) => {
  const db = c.get('db');
  const { email, password } = await c.req.json();

  const user = await db.select().from(customerUsers).where(eq(customerUsers.email, email)).get();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Update last login
  await db.update(customerUsers)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(customerUsers.id, user.id));

  // Generate tokens
  const accessToken = await signJwt(
    { sub: user.id, email: user.email, type: 'customer' },
    c.env.JWT_SECRET,
    '15m'
  );

  const refreshTokenValue = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(customerRefreshTokens).values({
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
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
  });
});

// POST /api/customer/refresh
customerAuthRoutes.post('/refresh', async (c) => {
  const db = c.get('db');

  let refreshToken: string | undefined;
  try {
    const body = await c.req.json();
    refreshToken = body.refreshToken;
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  const tokenRecord = await db.select().from(customerRefreshTokens).where(eq(customerRefreshTokens.token, refreshToken)).get();

  if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  const user = await db.select().from(customerUsers).where(eq(customerUsers.id, tokenRecord.userId)).get();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const accessToken = await signJwt(
    { sub: user.id, email: user.email, type: 'customer' },
    c.env.JWT_SECRET,
    '15m'
  );

  return c.json({ accessToken });
});

// POST /api/customer/logout
customerAuthRoutes.post('/logout', async (c) => {
  const db = c.get('db');
  const { refreshToken } = await c.req.json();

  if (refreshToken) {
    await db.delete(customerRefreshTokens).where(eq(customerRefreshTokens.token, refreshToken));
  }

  return c.json({ success: true });
});

// GET /api/customer/me
customerAuthRoutes.get('/me', customerAuth, async (c) => {
  const user = c.get('customerUser');
  return c.json(user);
});

// POST /api/customer/verify-email
customerAuthRoutes.post('/verify-email', async (c) => {
  const db = c.get('db');
  const { token } = await c.req.json();

  const user = await db.select().from(customerUsers).where(eq(customerUsers.verificationToken, token)).get();

  if (!user) {
    return c.json({ error: 'Invalid verification token' }, 400);
  }

  if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
    return c.json({ error: 'Verification token expired' }, 400);
  }

  await db.update(customerUsers)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerUsers.id, user.id));

  return c.json({ success: true });
});

// POST /api/customer/resend-verification
customerAuthRoutes.post('/resend-verification', customerAuth, async (c) => {
  const db = c.get('db');
  const customerUser = c.get('customerUser');

  if (customerUser?.emailVerified) {
    return c.json({ error: 'Email already verified' }, 400);
  }

  const verificationToken = crypto.randomUUID();
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.update(customerUsers)
    .set({
      verificationToken,
      verificationTokenExpiry,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerUsers.id, customerUser!.id));

  // TODO: Send verification email via Resend

  return c.json({ success: true });
});

// POST /api/customer/google - Google OAuth sign-in
customerAuthRoutes.post('/google', async (c) => {
  const db = c.get('db');
  const { credential } = await c.req.json();

  if (!credential) {
    return c.json({ error: 'Google credential is required' }, 400);
  }

  // Verify the Google ID token
  const googleResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  );

  if (!googleResponse.ok) {
    return c.json({ error: 'Invalid Google token' }, 401);
  }

  const googleUser = await googleResponse.json() as {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  if (!googleUser.email) {
    return c.json({ error: 'Email not provided by Google' }, 400);
  }

  // Check if user already exists
  let user = await db.select().from(customerUsers)
    .where(eq(customerUsers.email, googleUser.email.toLowerCase()))
    .get();

  const now = new Date().toISOString();

  if (!user) {
    // Create new user from Google data
    user = await db.insert(customerUsers).values({
      email: googleUser.email.toLowerCase(),
      passwordHash: '', // No password for Google users
      firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || 'User',
      lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
      emailVerified: true, // Google emails are pre-verified
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }).returning().get();
  } else {
    // Update existing user
    await db.update(customerUsers)
      .set({
        emailVerified: true,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(customerUsers.id, user.id));
    user.emailVerified = true;
  }

  // Generate tokens
  const accessToken = await signJwt(
    { sub: user.id, email: user.email, type: 'customer' },
    c.env.JWT_SECRET,
    '15m'
  );

  const refreshTokenValue = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(customerRefreshTokens).values({
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
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
  });
});
