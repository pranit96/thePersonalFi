import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

async function main() {
  const DATABASE_URL = 'postgresql://neondb_owner:npg_qMW5L1JIDQOB@ep-white-base-a5c16xo8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  // Create SQL connection
  const neonClient = neon(DATABASE_URL);
  
  // Create Drizzle ORM instance without schema
  const db = drizzle(neonClient);
  
  console.log('Creating tables in the Neon PostgreSQL database...');
  
  try {
    // Create session table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS session (
        sid TEXT PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
    `);
    
    // Create users table
    await db.execute(sql`
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
    
    // Create transactions table
    await db.execute(sql`
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
    
    // Create salary_records table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS salary_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        date DATE NOT NULL
      );
    `);
    
    // Create goals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        current_amount NUMERIC NOT NULL,
        target_date DATE
      );
    `);
    
    // Create savings_records table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS savings_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        date DATE NOT NULL
      );
    `);
    
    // Create category_spending table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS category_spending (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL
      );
    `);
    
    // Create ai_insights table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        date DATE NOT NULL
      );
    `);
    
    console.log('All tables created successfully!');
    
    // Test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Connection verified:', result);
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

main();