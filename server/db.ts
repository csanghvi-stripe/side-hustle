
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Use connection pooler URL
const poolUrl = process.env.DATABASE_URL!.replace('.us-east-2', '-pooler.us-east-2');
const sql = neon(poolUrl);
export const db = drizzle(sql, { schema });
