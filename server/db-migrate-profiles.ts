import { db } from './db';
import pg from 'pg';
import { logger } from './discovery/utils';

async function runMigration() {
  logger.info('Starting user profiles migration...');
  const client = new pg.Client(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    
    // Check if columns exist before adding them
    const checkDisplayNameQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'display_name';
    `;
    
    const displayNameResult = await client.query(checkDisplayNameQuery);
    
    if (displayNameResult.rows.length === 0) {
      logger.info('Adding display_name column to user_profiles table');
      await client.query(`
        ALTER TABLE user_profiles
        ADD COLUMN display_name TEXT;
      `);
    } else {
      logger.info('display_name column already exists in user_profiles table');
    }
    
    // Check for bio column
    const checkBioQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'bio';
    `;
    
    const bioResult = await client.query(checkBioQuery);
    
    if (bioResult.rows.length === 0) {
      logger.info('Adding bio column to user_profiles table');
      await client.query(`
        ALTER TABLE user_profiles
        ADD COLUMN bio TEXT;
      `);
    } else {
      logger.info('bio column already exists in user_profiles table');
    }
    
    // Ensure skills column exists
    const checkSkillsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'skills';
    `;
    
    const skillsResult = await client.query(checkSkillsQuery);
    
    if (skillsResult.rows.length === 0) {
      logger.info('Adding skills column to user_profiles table');
      await client.query(`
        ALTER TABLE user_profiles
        ADD COLUMN skills JSONB DEFAULT '[]'::jsonb;
      `);
    } else {
      logger.info('skills column already exists in user_profiles table');
    }
    
    logger.info('User profiles migration completed successfully');
  } catch (error) {
    logger.error(`Error migrating user_profiles table: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });