import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/aws-lambda';
import { env } from './config/env.js';
import { appErrorHandler } from './lib/errors.js';

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────
// CORS: '*' is a dev convenience (and the RN mobile app isn't subject to CORS anyway).
// In production set CORS_ORIGINS to explicit web origins — avoid '*' on an authenticated API.
const corsOrigin =
  env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim());

app.use('*', logger());
app.use('*', cors({ origin: corsOrigin, allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

// ─── Health Checks (outside any DB gate) ──────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'Destow API', version: '1.0.0' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
// Feature modules are mounted here as each is built. Migrations run as a deploy/CI
// step (npm run db:migrate), not on the request path.

// ─── 404 + Error Handlers ─────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: 'Route not found', code: 'not_found' }, 404));
app.onError(appErrorHandler);

// ─── Local Server (Lambda exports the handler below) ──────────────────────────
const PORT = parseInt(env.PORT || '3000', 10);
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  !process.env.LAMBDA_TASK_ROOT
) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`\nDestow API running at http://localhost:${info.port}`);
  });
}

export const handler = handle(app);
export default app;
