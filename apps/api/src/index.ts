import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/aws-lambda';
import { env } from './config/env.js';
import { appErrorHandler } from './lib/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { homeRoutes } from './modules/home/home.routes.js';
import { cabsRoutes } from './modules/cabs/cabs.routes.js';
import { historyRoutes } from './modules/history/history.routes.js';

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

// ─── API Routes (migrations run as a deploy step, not on the request path) ────
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', usersRoutes);
app.route('/api/v1/home', homeRoutes);
app.route('/api/v1/cabs', cabsRoutes);
app.route('/api/v1/history', historyRoutes);

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
    console.log(`\n Destow API running at http://localhost:${info.port}`);
  });
}

export const handler = handle(app);
export default app;
