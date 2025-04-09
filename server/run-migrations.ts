import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './discovery/utils';

const execAsync = promisify(exec);

async function runMigrations() {
  const migrations = [
    './server/db-migrate-user-display-name.ts',
    './server/db-migrate-profiles.ts',
    './server/db-migrate-messages.ts',
  ];
  
  logger.info('Starting all database migrations...');
  
  for (const migration of migrations) {
    try {
      logger.info(`Running migration: ${migration}`);
      const { stdout, stderr } = await execAsync(`npx tsx ${migration}`);
      
      if (stdout) {
        console.log(stdout);
      }
      
      if (stderr) {
        console.error(stderr);
      }
      
      logger.info(`Completed migration: ${migration}`);
    } catch (error) {
      logger.error(`Migration ${migration} failed: ${error.message}`);
      // Continue with other migrations even if one fails
    }
  }
  
  logger.info('All migrations completed');
}

runMigrations()
  .then(() => {
    console.log('All migrations processed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });