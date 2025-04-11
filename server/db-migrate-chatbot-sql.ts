import { DATABASE_URL } from "./config";
import pkg from "pg";
const { Pool } = pkg;

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }
});

const updateUsersTable = `
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS chat_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMP;
`;

const createChatConversationsTable = `
CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT DEFAULT 'Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  context TEXT,
  is_archived BOOLEAN DEFAULT FALSE
);
`;

const createChatMessagesTable = `
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  tokens_used INTEGER DEFAULT 0,
  credits_cost INTEGER DEFAULT 1
);
`;

const createSubscriptionPlansTable = `
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_credits INTEGER NOT NULL,
  price_per_month NUMERIC NOT NULL,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

const createCreditTransactionsTable = `
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  message_id INTEGER REFERENCES chat_messages(id),
  created_at TIMESTAMP DEFAULT NOW(),
  balance_after INTEGER NOT NULL
);
`;

const insertSubscriptionPlans = `
INSERT INTO subscription_plans (name, stripe_price_id, description, monthly_credits, price_per_month, features, is_active)
VALUES 
  (
    'Basic', 
    'price_placeholder_basic', 
    'Get started with our AI Coach with 50 messages per month', 
    50, 
    9.99,
    '["Access to AI Career Coach", "50 messages per month", "Basic career guidance", "Resume feedback"]',
    TRUE
  ),
  (
    'Pro', 
    'price_placeholder_pro', 
    'Unlimited coaching and personalized career advice', 
    200, 
    19.99,
    '["Everything in Basic", "200 messages per month", "Personalized career roadmaps", "Industry-specific advice", "Interview preparation"]',
    TRUE
  ),
  (
    'Premium', 
    'price_placeholder_premium', 
    'Our most comprehensive career coaching package', 
    500, 
    39.99,
    '["Everything in Pro", "500 messages per month", "Priority support", "Salary negotiation strategies", "Job search automation", "Network building tactics"]',
    TRUE
  )
ON CONFLICT (stripe_price_id) DO NOTHING;
`;

async function runMigration() {
  console.log("Starting database migration for chatbot and subscriptions...");

  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Add subscription fields to the users table
    await client.query(updateUsersTable);
    console.log("✅ Added subscription fields to users table");

    // Create chat conversations table
    await client.query(createChatConversationsTable);
    console.log("✅ Created chat_conversations table");

    // Create chat messages table
    await client.query(createChatMessagesTable);
    console.log("✅ Created chat_messages table");

    // Create subscription plans table
    await client.query(createSubscriptionPlansTable);
    console.log("✅ Created subscription_plans table");

    // Create credit transactions table
    await client.query(createCreditTransactionsTable);
    console.log("✅ Created credit_transactions table");

    // Insert default subscription plans
    await client.query(insertSubscriptionPlans);
    console.log("✅ Added default subscription plans");

    // Commit the transaction
    await client.query('COMMIT');

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Migration script completed, exiting.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });