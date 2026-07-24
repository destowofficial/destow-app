import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { safeError } from '../lib/log/safe.js';
import { db, pool } from './connection.js';

async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error(`Migration failed: ${safeError(error)}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
