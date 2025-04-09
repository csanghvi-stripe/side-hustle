import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { promotionCodes } from '@shared/schema';
import pkg from 'pg';
const { Pool } = pkg;

async function runMigration() {
  // First check if tables exist
  let existingTables;
  
  try {
    console.log('Checking existing tables...');
    existingTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('Existing tables:', existingTables.map(row => row.table_name));
  } catch (error) {
    console.error('Error checking tables:', error);
    return;
  }
  
  // Check if the promotion_codes table exists
  const hasPromotionCodesTable = existingTables.some(
    (table: any) => table.table_name === 'promotion_codes'
  );
  
  // Create the tables if they don't exist
  if (!hasPromotionCodesTable) {
    try {
      console.log('Creating promotion_codes table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS promotion_codes (
          id SERIAL PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          credits_amount INTEGER NOT NULL,
          expiry_date TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          max_uses INTEGER,
          current_uses INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Promotion codes table created successfully');
    } catch (error) {
      console.error('Error creating promotion_codes table:', error);
    }
  } else {
    console.log('Promotion codes table already exists, skipping creation');
  }
  
  // Create a test promo code
  try {
    // Create a WELCOME100 code that gives 100 credits, never expires, and can be used unlimited times
    const existingCode = await db.select().from(promotionCodes).where(eq(promotionCodes.code, 'WELCOME100'));
    
    if (existingCode.length === 0) {
      console.log('Creating test promotion code WELCOME100...');
      await db.insert(promotionCodes).values({
        code: 'WELCOME100',
        creditsAmount: 100,
        isActive: true
      });
      console.log('Test promotion code created successfully');
    } else {
      console.log('Test promotion code already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating test promotion code:', error);
  }
  
  console.log('Migration completed');
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Promotion code migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running promotion code migration:', err);
    process.exit(1);
  });