// Bun loads .env automatically - no dotenv needed. The schema and its guards
// live in env.schema.ts so they can be tested without this import-time parse.
import { parseEnv } from './env.schema.js';

export { envSchema, parseEnv, type Env } from './env.schema.js';

export const env = parseEnv();
