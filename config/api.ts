// API Configuration
// In development, defaults to localhost:3002
// In production, set VITE_API_BASE environment variable

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002/api';

// Stripe public key for client-side
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

// Helper to check if Stripe is configured
export const isStripeConfigured = (): boolean => !!STRIPE_PUBLIC_KEY;
