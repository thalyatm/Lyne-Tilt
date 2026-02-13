// Admin API Configuration
// In development, defaults to localhost:3002
// In production, set VITE_API_BASE environment variable
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002/api';
