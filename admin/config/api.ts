// Admin API Configuration
// In development, Vite proxies /api to the Workers dev server (see vite.config.ts)
// In production, set VITE_API_BASE to the full Workers URL
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
