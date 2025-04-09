import { db } from './db';
import pg from 'pg';
import { logger } from './discovery/utils';

async function runMigration() {
  logger.info('Starting users table migration for display_name...');
  const client = new pg.Client(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    
    // Check if display_name column exists in users table
    const checkDisplayNameQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'display_name';
    `;
    
    const displayNameResult = await client.query(checkDisplayNameQuery);
    
    if (displayNameResult.rows.length === 0) {
      logger.info('Adding display_name column to users table');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN display_name TEXT;
      `);
      
      // Update existing users to have username as display_name
      await client.query(`
        UPDATE users
        SET display_name = username
        WHERE display_name IS NULL;
      `);
    } else {
      logger.info('display_name column already exists in users table');
    }
    
    logger.info('Users table migration completed successfully');
  } catch (error) {
    logger.error(`Error migrating users table: ${error.message}`);
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