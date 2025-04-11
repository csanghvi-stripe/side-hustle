import { db } from './db';
import { logger } from './discovery/utils';


async function runMigration() {
  logger.info('Starting users table migration for display_name...');

  try {
    // Check if display_name column exists in users table
    const checkDisplayNameQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'display_name';
    `;

    const displayNameResult = await db.execute(
      db.raw(checkDisplayNameQuery)
    );

    if (displayNameResult.rows.length === 0) { // Check if the query result has rows
      logger.info('Adding display_name column to users table');
      await db.execute(db.raw(`
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
  } catch (error:any) {
    logger.error(`Error migrating users table: ${error.message}`);
    throw error;
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
