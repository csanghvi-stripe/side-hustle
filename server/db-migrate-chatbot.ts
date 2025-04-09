import { db, sessionPool } from "./db";
import * as schema from "../shared/schema";
import { pgTable, serial, text, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a fresh connection to make sure we have schema access
const queryClient = drizzle(sessionPool);

async function runMigration() {
  console.log("Starting database migration for chatbot and subscriptions...");

  try {
    // Add subscription fields to the users table
    await queryClient.schema.alterTable("users")
      .addColumn("subscription_status", text("subscription_status").default("free"))
      .addColumn("subscription_tier", text("subscription_tier").default("free"))
      .addColumn("subscription_expires_at", timestamp("subscription_expires_at"))
      .addColumn("stripe_customer_id", text("stripe_customer_id"))
      .addColumn("stripe_subscription_id", text("stripe_subscription_id"))
      .addColumn("chat_credits", integer("chat_credits").default(0))
      .addColumn("last_credit_reset", timestamp("last_credit_reset"))
      .execute();
    
    console.log("✅ Added subscription fields to users table");

    // Create chat conversations table
    await queryClient.schema.createTable("chat_conversations")
      .ifNotExists()
      .addColumn("id", serial("id").primaryKey())
      .addColumn("user_id", integer("user_id").references(() => schema.users.id).notNull())
      .addColumn("title", text("title").default("Conversation"))
      .addColumn("created_at", timestamp("created_at").defaultNow())
      .addColumn("updated_at", timestamp("updated_at").defaultNow())
      .addColumn("context", text("context"))
      .addColumn("is_archived", boolean("is_archived").default(false))
      .execute();
    
    console.log("✅ Created chat_conversations table");

    // Create chat messages table
    await queryClient.schema.createTable("chat_messages")
      .ifNotExists()
      .addColumn("id", serial("id").primaryKey())
      .addColumn("conversation_id", integer("conversation_id").references(() => schema.chatConversations.id).notNull())
      .addColumn("role", text("role").notNull())
      .addColumn("content", text("content").notNull())
      .addColumn("timestamp", timestamp("timestamp").defaultNow())
      .addColumn("tokens_used", integer("tokens_used").default(0))
      .addColumn("credits_cost", integer("credits_cost").default(1))
      .execute();
    
    console.log("✅ Created chat_messages table");

    // Create subscription plans table
    await queryClient.schema.createTable("subscription_plans")
      .ifNotExists()
      .addColumn("id", serial("id").primaryKey())
      .addColumn("name", text("name").notNull())
      .addColumn("stripe_price_id", text("stripe_price_id").notNull())
      .addColumn("description", text("description"))
      .addColumn("monthly_credits", integer("monthly_credits").notNull())
      .addColumn("price_per_month", numeric("price_per_month").notNull())
      .addColumn("features", jsonb("features").default([]))
      .addColumn("is_active", boolean("is_active").default(true))
      .addColumn("created_at", timestamp("created_at").defaultNow())
      .execute();
    
    console.log("✅ Created subscription_plans table");

    // Create credit transactions table
    await queryClient.schema.createTable("credit_transactions")
      .ifNotExists()
      .addColumn("id", serial("id").primaryKey())
      .addColumn("user_id", integer("user_id").references(() => schema.users.id).notNull())
      .addColumn("amount", integer("amount").notNull())
      .addColumn("reason", text("reason").notNull())
      .addColumn("message_id", integer("message_id").references(() => schema.chatMessages.id))
      .addColumn("created_at", timestamp("created_at").defaultNow())
      .addColumn("balance_after", integer("balance_after").notNull())
      .execute();
    
    console.log("✅ Created credit_transactions table");

    // Insert default subscription plans
    await queryClient.insert(schema.subscriptionPlans).values([
      {
        name: "Basic",
        stripePriceId: "price_placeholder_basic",
        description: "Get started with our AI Coach with 50 messages per month",
        monthlyCredits: 50,
        pricePerMonth: "9.99",
        features: JSON.stringify([
          "Access to AI Career Coach",
          "50 messages per month",
          "Basic career guidance",
          "Resume feedback"
        ]),
        isActive: true
      },
      {
        name: "Pro",
        stripePriceId: "price_placeholder_pro",
        description: "Unlimited coaching and personalized career advice",
        monthlyCredits: 200,
        pricePerMonth: "19.99",
        features: JSON.stringify([
          "Everything in Basic",
          "200 messages per month",
          "Personalized career roadmaps",
          "Industry-specific advice",
          "Interview preparation"
        ]),
        isActive: true
      },
      {
        name: "Premium",
        stripePriceId: "price_placeholder_premium",
        description: "Our most comprehensive career coaching package",
        monthlyCredits: 500,
        pricePerMonth: "39.99",
        features: JSON.stringify([
          "Everything in Pro",
          "500 messages per month",
          "Priority support",
          "Salary negotiation strategies",
          "Job search automation",
          "Network building tactics"
        ]),
        isActive: true
      }
    ]).execute();

    console.log("✅ Added default subscription plans");
    console.log("✅ Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// In ESM, we can just run the migration directly
runMigration()
  .then(() => {
    console.log("Migration script completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

export default runMigration;