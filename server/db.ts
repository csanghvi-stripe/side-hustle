import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Use environment variables for connection details
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a connection pool
const pool = new Pool({ connectionString });

// Create drizzle instance
export const db = drizzle(pool, { schema });