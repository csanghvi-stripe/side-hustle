import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Pool } from "pg"; // Add this import
import * as schema from "../shared/schema";

// Create postgres-js client for Drizzle
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  ssl: true,
  max: 10,
});

// Create a standard node-postgres pool for session store
// This is more compatible with connect-pg-simple
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // May need this for Neon
  },
});

// Export drizzle instance
export const db = drizzle(client, { schema });

// Export pg Pool for session store
export const sessionPool = pgPool;
