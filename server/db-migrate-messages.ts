import { db } from './db';
import pg from 'pg';
import { logger } from './discovery/utils';
import { DATABASE_URL } from './config';

async function runMigration() {
  logger.info('Starting messages table migration...');
  const client = new pg.Client(DATABASE_URL);

  try {
    await client.connect();
    
    // Check if sender_name column exists
    const checkSenderNameQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'sender_name';
    `;
    
    const senderNameResult = await client.query(checkSenderNameQuery);
    
    if (senderNameResult.rows.length === 0) {
      logger.info('Adding sender_name column to messages table');
      await client.query(`
        ALTER TABLE messages
        ADD COLUMN sender_name TEXT;
      `);
      
      // Update existing rows with a placeholder sender name
      await client.query(`
        UPDATE messages
        SET sender_name = 'User ' || sender_id
        WHERE sender_name IS NULL;
      `);
      
      // Now make it not null
      await client.query(`
        ALTER TABLE messages
        ALTER COLUMN sender_name SET NOT NULL;
      `);
    } else {
      logger.info('sender_name column already exists in messages table');
    }
    
    logger.info('Messages table migration completed successfully');
  } catch (error) {
    logger.error(`Error migrating messages table: ${error.message}`);
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