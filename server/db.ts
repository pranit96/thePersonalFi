import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

// Get the database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

// Create a SQL connection
const neonClient = neon(DATABASE_URL);

// Create Drizzle ORM instance
export const db = drizzle(neonClient, { schema });

// Export a test function to check database connection
export async function testConnection() {
  try {
    // Try to query the database to test the connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}