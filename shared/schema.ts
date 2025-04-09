import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uniqueIndex, varchar, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with social networking features
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  // Social network settings
  discoverable: boolean("discoverable").default(true),
  allowMessages: boolean("allow_messages").default(true),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    usernameIdx: uniqueIndex("username_idx").on(table.username),
    emailIdx: uniqueIndex("email_idx").on(table.email),
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  profilePicture: true,
  bio: true,
  discoverable: true,
  allowMessages: true,
});

// User profiles table for storing monetization preferences
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  skills: jsonb("skills").default([]),
  timeAvailability: text("time_availability"),
  incomeGoals: integer("income_goals"),
  riskTolerance: text("risk_tolerance"),
  workPreference: text("work_preference"),
  additionalDetails: text("additional_details"),
  discoverable: boolean("discoverable").default(true),
  allowMessages: boolean("allow_messages").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex("user_id_idx").on(table.userId),
  };
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  userId: true,
  displayName: true,
  bio: true,
  skills: true,
  timeAvailability: true,
  incomeGoals: true,
  riskTolerance: true,
  workPreference: true,
  additionalDetails: true,
  discoverable: true,
  allowMessages: true,
});

// Monetization opportunity table
export const monetizationOpportunities = pgTable("monetization_opportunities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  opportunityData: jsonb("opportunity_data").notNull(),
  createdAt: text("created_at").notNull(),
  shared: boolean("shared").default(false), // Whether opportunity is shared with community
  skills: jsonb("skills").default([]), // The user's skills related to this opportunity
  title: text("title"), // Optional descriptive title for the saved search
});

export const insertMonetizationOpportunitySchema = createInsertSchema(monetizationOpportunities).pick({
  userId: true,
  opportunityData: true,
  createdAt: true,
  shared: true,
  skills: true,
  title: true,
});

// Messages table for inbox functionality
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  senderName: text("sender_name").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  recipientId: true,
  senderName: true,
  subject: true,
  content: true,
});

// Connections between users
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected, blocked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    connectionIdx: uniqueIndex("connection_idx").on(table.requesterId, table.recipientId),
  };
});

export const insertConnectionSchema = createInsertSchema(connections).pick({
  requesterId: true,
  recipientId: true,
  status: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertMonetizationOpportunity = z.infer<typeof insertMonetizationOpportunitySchema>;
export type MonetizationOpportunity = typeof monetizationOpportunities.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

// Analytics & Tracking
export const progressTracking = pgTable("progress_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  opportunityId: integer("opportunity_id").references(() => monetizationOpportunities.id).notNull(),
  opportunityTitle: text("opportunity_title").notNull(),
  opportunityType: text("opportunity_type").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  targetDate: timestamp("target_date"),
  firstRevenueDate: timestamp("first_revenue_date"),
  firstRevenueAmount: numeric("first_revenue_amount"),
  currentStage: text("current_stage").notNull(), // planning, started, first_milestone, consistent_income, etc.
  nextMilestone: text("next_milestone"),
  timeInvested: integer("time_invested_hours"),
  costInvested: numeric("cost_invested"),
  totalRevenue: numeric("total_revenue").default("0"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  notes: text("notes"),
});

export const insertProgressTrackingSchema = createInsertSchema(progressTracking).pick({
  userId: true,
  opportunityId: true,
  opportunityTitle: true,
  opportunityType: true,
  startDate: true,
  targetDate: true,
  firstRevenueDate: true,
  firstRevenueAmount: true,
  currentStage: true,
  nextMilestone: true,
  timeInvested: true,
  costInvested: true,
  totalRevenue: true,
  notes: true,
});

// Progress Milestones table
export const progressMilestones = pgTable("progress_milestones", {
  id: serial("id").primaryKey(),
  progressId: integer("progress_id").references(() => progressTracking.id).notNull(),
  milestoneName: text("milestone_name").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  completedDate: timestamp("completed_date"),
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
  revenueImpact: numeric("revenue_impact"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgressMilestoneSchema = createInsertSchema(progressMilestones).pick({
  progressId: true,
  milestoneName: true,
  description: true,
  targetDate: true,
  completedDate: true,
  isCompleted: true,
  notes: true,
  revenueImpact: true,
});

// Income Tracking
export const incomeEntries = pgTable("income_entries", {
  id: serial("id").primaryKey(),
  progressId: integer("progress_id").references(() => progressTracking.id).notNull(),
  amount: numeric("amount").notNull(),
  source: text("source").notNull(),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  notes: text("notes"),
  category: text("category"), // client_work, product_sale, affiliate, etc.
  isRecurring: boolean("is_recurring").default(false),
});

export const insertIncomeEntrySchema = createInsertSchema(incomeEntries).pick({
  progressId: true,
  amount: true,
  source: true,
  entryDate: true,
  notes: true,
  category: true,
  isRecurring: true,
});

// Types for analytics tables
export type InsertProgressTracking = z.infer<typeof insertProgressTrackingSchema>;
export type ProgressTracking = typeof progressTracking.$inferSelect;

export type InsertProgressMilestone = z.infer<typeof insertProgressMilestoneSchema>;
export type ProgressMilestone = typeof progressMilestones.$inferSelect;

export type InsertIncomeEntry = z.infer<typeof insertIncomeEntrySchema>;
export type IncomeEntry = typeof incomeEntries.$inferSelect;
