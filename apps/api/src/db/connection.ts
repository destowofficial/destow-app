import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

// Resolve SSL: explicit DATABASE_SSL wins; otherwise prod uses TLS (no-verify),
// local/dev uses none. For verified TLS in prod, set DATABASE_SSL=require and
// provide the RDS CA bundle via NODE_EXTRA_CA_CERTS.
function sslConfig(): pg.PoolConfig['ssl'] {
  const mode = env.DATABASE_SSL ?? (env.NODE_ENV === 'production' ? 'no-verify' : 'disable');
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
  // Lambda-friendly pool tuning: keep connections bounded so many warm
  // instances don't exhaust Postgres max_connections.
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export { pool };
