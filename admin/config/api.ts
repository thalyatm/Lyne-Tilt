// Admin API Configuration
// In development, Vite proxies /api to the Workers dev server (see vite.config.ts)
// In production, set VITE_API_BASE to the full Workers URL
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Resolve relative image URLs (e.g. /api/upload/...) to absolute URLs in production
export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/')) {
    return API_BASE + url.slice(4);
  }
  return url;
}
