import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, lt } from 'drizzle-orm';
import { db, users, refreshTokens } from '../db/index.js';
import { generateAccessToken, generateRefreshToken, verifyToken, getRefreshTokenExpiry } from '../config/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: getRefreshTokenExpiry(),
    createdAt: new Date(),
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AppError('No refresh token provided', 401);
  }

  const storedTokenResult = await db.select().from(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  const storedToken = storedTokenResult[0];

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    // Remove expired token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    throw new AppError('Refresh token expired', 401);
  }

  try {
    const decoded = verifyToken(refreshToken);
    const userResult = await db.select().from(users).where(eq(users.id, decoded.userId));
    const user = userResult[0];

    if (!user) {
      throw new AppError('User not found', 401);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Rotate refresh token - delete old and create new
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
      createdAt: new Date(),
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const result = await db.select().from(users).where(eq(users.id, req.user?.userId));
  const user = result[0];

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const result = await db.select().from(users).where(eq(users.id, req.user?.userId));
  const user = result[0];

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!validPassword) {
    throw new AppError('Current password is incorrect', 400);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, req.user?.userId));

  res.json({ message: 'Password updated successfully' });
});

export default router;
