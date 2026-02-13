import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, customerUsers, customerRefreshTokens } from '../db/index.js';
import {
  customerAuthMiddleware,
  generateCustomerAccessToken,
  generateCustomerRefreshToken,
  verifyCustomerToken,
  getCustomerRefreshTokenExpiry,
  CustomerTokenPayload,
} from '../middleware/customerAuth.js';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/email.js';

const router = Router();

// Password validation rules
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return { valid: errors.length === 0, errors };
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getVerificationTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours
  return expiry;
}

function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour
  return expiry;
}

// ============ REGISTRATION ============

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if email already exists
    const existing = await db.select().from(customerUsers)
      .where(eq(customerUsers.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

    // Create user
    const now = new Date();
    const result = await db.insert(customerUsers).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'customer',
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const newUser = result[0];

    // Send verification email
    await sendVerificationEmail(newUser.email, newUser.firstName, verificationToken);

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ============ LOGIN ============

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const users = await db.select().from(customerUsers)
      .where(eq(customerUsers.email, email.toLowerCase()));
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.update(customerUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(customerUsers.id, user.id));

    // Generate tokens
    const tokenPayload: CustomerTokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'customer',
      emailVerified: user.emailVerified,
    };

    const accessToken = generateCustomerAccessToken(tokenPayload);
    const refreshToken = generateCustomerRefreshToken(tokenPayload);

    // Store refresh token
    await db.insert(customerRefreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getCustomerRefreshTokenExpiry(),
      createdAt: new Date(),
    });

    // Set refresh token as httpOnly cookie
    res.cookie('customerRefreshToken', refreshToken, {
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
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ GOOGLE OAUTH ============

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google ID token
    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!googleResponse.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const googleUser: GoogleUserInfo = await googleResponse.json();

    if (!googleUser.email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Check if user already exists
    const existingUsers = await db.select().from(customerUsers)
      .where(eq(customerUsers.email, googleUser.email.toLowerCase()));
    let user = existingUsers[0];

    const now = new Date();

    if (!user) {
      // Create new user from Google data
      const result = await db.insert(customerUsers).values({
        email: googleUser.email.toLowerCase(),
        passwordHash: '', // No password for Google users
        firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || 'User',
        lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
        role: 'customer',
        emailVerified: googleUser.email_verified || true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      }).returning();

      user = result[0];

      // Send welcome email for new Google users
      await sendWelcomeEmail(user.email, user.firstName);
    } else {
      // Update existing user - mark email as verified if not already
      if (!user.emailVerified) {
        await db.update(customerUsers)
          .set({ emailVerified: true, updatedAt: now, lastLoginAt: now })
          .where(eq(customerUsers.id, user.id));
        user.emailVerified = true;
      } else {
        await db.update(customerUsers)
          .set({ lastLoginAt: now })
          .where(eq(customerUsers.id, user.id));
      }
    }

    // Generate tokens
    const tokenPayload: CustomerTokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'customer',
      emailVerified: user.emailVerified,
    };

    const accessToken = generateCustomerAccessToken(tokenPayload);
    const refreshToken = generateCustomerRefreshToken(tokenPayload);

    // Store refresh token
    await db.insert(customerRefreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getCustomerRefreshTokenExpiry(),
      createdAt: now,
    });

    // Set refresh token as httpOnly cookie
    res.cookie('customerRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// ============ REFRESH TOKEN ============

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.customerRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify the token exists in DB
    const storedTokens = await db.select().from(customerRefreshTokens)
      .where(eq(customerRefreshTokens.token, refreshToken));
    const storedToken = storedTokens[0];

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check expiry
    if (new Date(storedToken.expiresAt) < new Date()) {
      // Remove expired token
      await db.delete(customerRefreshTokens).where(eq(customerRefreshTokens.id, storedToken.id));
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Verify JWT
    let decoded: CustomerTokenPayload;
    try {
      decoded = verifyCustomerToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get fresh user data
    const users = await db.select().from(customerUsers).where(eq(customerUsers.id, decoded.userId));
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newTokenPayload: CustomerTokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'customer',
      emailVerified: user.emailVerified,
    };

    const newAccessToken = generateCustomerAccessToken(newTokenPayload);
    const newRefreshToken = generateCustomerRefreshToken(newTokenPayload);

    // Rotate refresh token (remove old, add new)
    await db.delete(customerRefreshTokens).where(eq(customerRefreshTokens.id, storedToken.id));
    await db.insert(customerRefreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getCustomerRefreshTokenExpiry(),
      createdAt: new Date(),
    });

    // Set new refresh token cookie
    res.cookie('customerRefreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ============ LOGOUT ============

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.customerRefreshToken;

    if (refreshToken) {
      // Remove refresh token from DB
      await db.delete(customerRefreshTokens).where(eq(customerRefreshTokens.token, refreshToken));
    }

    // Clear cookie
    res.clearCookie('customerRefreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============ GET CURRENT USER ============

router.get('/me', customerAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await db.select().from(customerUsers).where(eq(customerUsers.id, req.customerUser!.userId));
    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============ EMAIL VERIFICATION ============

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this token
    const users = await db.select().from(customerUsers)
      .where(eq(customerUsers.verificationToken, token));
    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Check if token expired
    if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark as verified
    await db.update(customerUsers)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(customerUsers.id, user.id));

    // Send welcome email
    await sendWelcomeEmail(user.email, user.firstName);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', customerAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await db.select().from(customerUsers).where(eq(customerUsers.id, req.customerUser!.userId));
    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    await db.update(customerUsers)
      .set({
        verificationToken,
        verificationTokenExpiry: getVerificationTokenExpiry(),
        updatedAt: new Date(),
      })
      .where(eq(customerUsers.id, user.id));

    // Send verification email
    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// ============ PASSWORD RESET ============

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const users = await db.select().from(customerUsers)
      .where(eq(customerUsers.email, email.toLowerCase()));
    const user = users[0];

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists, a password reset email has been sent' });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    await db.update(customerUsers)
      .set({
        resetToken,
        resetTokenExpiry: getResetTokenExpiry(),
        updatedAt: new Date(),
      })
      .where(eq(customerUsers.id, user.id));

    // Send reset email
    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({ message: 'If an account exists, a password reset email has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Find user with this reset token
    const users = await db.select().from(customerUsers).where(eq(customerUsers.resetToken, token));
    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token expired
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(customerUsers)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(customerUsers.id, user.id));

    // Invalidate all refresh tokens for this user
    await db.delete(customerRefreshTokens).where(eq(customerRefreshTokens.userId, user.id));

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
