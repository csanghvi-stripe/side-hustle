import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Monetization opportunity table
export const monetizationOpportunities = pgTable("monetization_opportunities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  opportunityData: jsonb("opportunity_data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertMonetizationOpportunitySchema = createInsertSchema(monetizationOpportunities).pick({
  userId: true,
  opportunityData: true,
  createdAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMonetizationOpportunity = z.infer<typeof insertMonetizationOpportunitySchema>;
export type MonetizationOpportunity = typeof monetizationOpportunities.$inferSelect;
