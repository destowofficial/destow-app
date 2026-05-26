import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { homeRoutes } from './modules/home/home.routes.js';
import { cabsRoutes } from './modules/cabs/cabs.routes.js';
import { historyRoutes } from './modules/history/history.routes.js';
import { ensureDatabaseReady } from './db/bootstrap.js';

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use('/api/v1/*', async (c, next) => {
  await ensureDatabaseReady();
  await next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'Destow API', version: '1.0.0' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', usersRoutes);
app.route('/api/v1/home', homeRoutes);
app.route('/api/v1/cabs', cabsRoutes);
app.route('/api/v1/history', historyRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: 'Route not found' }, 404));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[Unhandled Error]', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

import { handle } from 'hono/aws-lambda';

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(env.PORT || '3000');

// Only start the node server locally. When in lambda, we export handle(app)
if (process.env.NODE_ENV !== 'production' && !process.env.LAMBDA_TASK_ROOT) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`\n🚕 Destow API running at http://localhost:${info.port}`);
    console.log(`📋 Routes:`);
    console.log(`   POST /api/v1/auth/request-otp`);
    console.log(`   POST /api/v1/auth/verify-otp`);
    console.log(`   GET  /api/v1/users/me`);
    console.log(`   PUT  /api/v1/users/me`);
    console.log(`   GET  /api/v1/home/user-info`);
    console.log(`   POST /api/v1/home/search`);
    console.log(`   POST /api/v1/cabs/available`);
    console.log(`   POST /api/v1/cabs/book`);
    console.log(`   POST /api/v1/cabs/payment`);
    console.log(`   GET  /api/v1/history`);
  });
}

export const handler = handle(app);
export default app;
