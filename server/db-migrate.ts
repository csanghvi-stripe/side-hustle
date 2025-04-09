import { db } from './db';
import { 
  progressTracking,
  progressMilestones,
  incomeEntries,
} from '@shared/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting database migration for analytics tables...');

  try {
    // Create progress_tracking table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS progress_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        opportunity_id INTEGER NOT NULL REFERENCES monetization_opportunities(id),
        opportunity_title TEXT NOT NULL,
        opportunity_type TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL DEFAULT NOW(),
        target_date TIMESTAMP,
        first_revenue_date TIMESTAMP,
        first_revenue_amount NUMERIC,
        current_stage TEXT NOT NULL,
        next_milestone TEXT,
        time_invested_hours INTEGER,
        cost_invested NUMERIC,
        total_revenue NUMERIC DEFAULT '0',
        last_updated TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);
    console.log('Created progress_tracking table');

    // Create progress_milestones table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS progress_milestones (
        id SERIAL PRIMARY KEY,
        progress_id INTEGER NOT NULL REFERENCES progress_tracking(id),
        milestone_name TEXT NOT NULL,
        description TEXT,
        target_date TIMESTAMP,
        completed_date TIMESTAMP,
        is_completed BOOLEAN DEFAULT FALSE,
        notes TEXT,
        revenue_impact NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created progress_milestones table');

    // Create income_entries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS income_entries (
        id SERIAL PRIMARY KEY,
        progress_id INTEGER NOT NULL REFERENCES progress_tracking(id),
        amount NUMERIC NOT NULL,
        source TEXT NOT NULL,
        entry_date TIMESTAMP NOT NULL DEFAULT NOW(),
        notes TEXT,
        category TEXT,
        is_recurring BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('Created income_entries table');

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });