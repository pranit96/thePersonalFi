import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './shared/schema.js';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

async function main() {
  const sql = neon('postgresql://neondb_owner:npg_qMW5L1JIDQOB@ep-white-base-a5c16xo8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require');
  const db = drizzle(sql, { schema });
  
  console.log('Creating tables in the Neon PostgreSQL database...');
  
  // Create tables without migrations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      data_encryption_enabled BOOLEAN DEFAULT TRUE,
      data_sharing_enabled BOOLEAN DEFAULT FALSE,
      anonymized_analytics BOOLEAN DEFAULT TRUE
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      date DATE NOT NULL,
      merchant TEXT,
      is_expense BOOLEAN DEFAULT TRUE
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salary_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      date DATE NOT NULL
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      current_amount NUMERIC NOT NULL,
      target_date DATE
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS savings_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      date DATE NOT NULL
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS category_spending (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      date DATE NOT NULL
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS session (
      sid TEXT PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
  `);
  
  console.log('All tables created successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error creating tables:', err);
  process.exit(1);
});