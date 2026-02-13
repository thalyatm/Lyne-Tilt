import { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { users, customerUsers } from '../db/schema';
import type { Bindings, Variables } from '../index';

// Simple JWT implementation for Workers (no external library needed)
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  return atob(str);
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload: object, secret: string, expiresIn: string = '15m'): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };

  // Calculate expiry
  const now = Math.floor(Date.now() / 1000);
  let exp = now;
  if (expiresIn.endsWith('m')) exp = now + parseInt(expiresIn) * 60;
  else if (expiresIn.endsWith('h')) exp = now + parseInt(expiresIn) * 3600;
  else if (expiresIn.endsWith('d')) exp = now + parseInt(expiresIn) * 86400;

  const fullPayload = { ...payload, iat: now, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await createHmacKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<any | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const key = await createHmacKey(secret);
    const encoder = new TextEncoder();

    // Decode signature
    const signatureStr = base64UrlDecode(encodedSignature);
    const signatureBytes = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureBytes[i] = signatureStr.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(dataToVerify));
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Admin auth middleware
export async function adminAuth(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload || payload.type !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Fetch user from database
  const db = c.get('db');
  const user = await db.select().from(users).where(eq(users.id, payload.sub)).get();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('user', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await next();
}

// Customer auth middleware
export async function customerAuth(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload || payload.type !== 'customer') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Fetch customer from database
  const db = c.get('db');
  const customer = await db.select().from(customerUsers).where(eq(customerUsers.id, payload.sub)).get();

  if (!customer) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('customerUser', {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    emailVerified: customer.emailVerified,
  });

  await next();
}

// Optional customer auth (doesn't fail if no token)
export async function optionalCustomerAuth(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    await next();
    return;
  }

  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (payload && payload.type === 'customer') {
    const db = c.get('db');
    const customer = await db.select().from(customerUsers).where(eq(customerUsers.id, payload.sub)).get();

    if (customer) {
      c.set('customerUser', {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        emailVerified: customer.emailVerified,
      });
    }
  }

  await next();
}
