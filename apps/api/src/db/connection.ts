import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

// Resolve SSL: an explicit DATABASE_SSL wins; otherwise production verifies and
// local uses none.
//
// Production used to default to 'no-verify', which encrypts the connection but
// checks nothing about who is on the other end - a machine-in-the-middle on the
// database path reads every booking, phone number and session row and is never
// detected. Encryption without verification mostly buys the reassurance of the
// word TLS.
//
// 'no-verify' is still available, but only by asking for it, which is the same
// rule the dev-affordance flags follow: the weaker option is never the default.
// For a managed Postgres, set DATABASE_SSL=require and supply the provider's CA
// bundle via NODE_EXTRA_CA_CERTS.
function sslConfig(): pg.PoolConfig['ssl'] {
  const mode = env.DATABASE_SSL ?? (env.NODE_ENV === 'production' ? 'require' : 'disable');

  if (env.NODE_ENV === 'production' && mode !== 'require') {
    // Loud, because this is the kind of setting that gets switched on to make a
    // certificate error go away and then stays on for years.
    console.warn(
      `[db] DATABASE_SSL=${mode} in production - the database connection is not verified. ` +
        'Prefer DATABASE_SSL=require with the provider CA in NODE_EXTRA_CA_CERTS.',
    );
  }

  switch (mode) {
    case 'require':
      return { rejectUnauthorized: true };
    case 'no-verify':
      return { rejectUnauthorized: false };
    case 'disable':
    default:
      return undefined;
  }
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig(),
  // Keep the pool bounded so multiple app instances don't exhaust Postgres
  // max_connections.
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export { pool };
