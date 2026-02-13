import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import * as schema from './schema.js';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('rlwy.net') ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Create Drizzle ORM instance with schema
export const db = drizzle(pool, { schema });

// Export pool for direct access if needed
export { pool };

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  console.log('Database connection pool closed');
}

// Initialize database connection
export async function initDatabase(): Promise<typeof db> {
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to PostgreSQL database');
  }
  console.log('PostgreSQL database connected successfully');
  return db;
}

// Re-export schema for convenience
export * from './schema.js';
