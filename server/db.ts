import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import pkg from "pg"; // Import pg as a namespace
import * as schema from "../shared/schema";

const { Pool } = pkg; // Extract Pool from the imported namespace

// Create postgres-js client for Drizzle
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
  ssl: true,
  max: 10
});

// Create a standard node-postgres pool for session store
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Export drizzle instance
export const db = drizzle(client, { schema });

// Export pg Pool for session store
export const sessionPool = pgPool;