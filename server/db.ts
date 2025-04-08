import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

//const sql = neon(process.env.DATABASE_URL!);
//export const db = drizzle({ client: sql });

// Use environment variables for connection details
const connectionString = neon(process.env.DATABASE_URL!);

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a connection pool
const pool = new Pool({ connectionString });

// Create drizzle instance
export const db = drizzle(pool, { schema });
