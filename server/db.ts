
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Use WebSocket protocol for serverless connections
const poolUrl = process.env.DATABASE_URL!.replace('postgres://', 'postgresql://').replace('.us-east-2', '-pooler.us-east-2');
const sql = neon(poolUrl, { 
  webSocketConstructor: WebSocket,
  useSecureWebSocket: true 
});
export const db = drizzle(sql, { schema });
