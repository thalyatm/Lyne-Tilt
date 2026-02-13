import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface CustomerTokenPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer';
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      customerUser?: CustomerTokenPayload;
    }
  }
}

export function generateCustomerAccessToken(payload: CustomerTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] });
}

export function generateCustomerRefreshToken(payload: CustomerTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as CustomerTokenPayload;
  if (decoded.role !== 'customer') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function getCustomerRefreshTokenExpiry(): Date {
  const days = parseInt(REFRESH_TOKEN_EXPIRY) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export function customerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyCustomerToken(token);
    req.customerUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyCustomerToken(token);
      req.customerUser = decoded;
    } catch (error) {
      // Token invalid, but that's okay for optional auth
    }
  }

  next();
}

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.customerUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.customerUser.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
}
