import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Create a PostgreSQL client with connection pooling
const sql = neon(process.env.DATABASE_URL!);

// Create a drizzle instance using the SQL client
export const db = drizzle(sql, { schema });