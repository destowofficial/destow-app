import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './lib/http/errors.js';
import { getJwks } from './lib/auth/keys.js';
import { v1Router } from './v1/index.js';

const app: express.Express = express();

// Behind the Caddy gateway: trust its X-Forwarded-For so req.ip is the real
// client IP (per-IP rate limits and session.ip records depend on this). '1' =
// exactly one proxy hop (the gateway).
app.set('trust proxy', 1);

// --- Global middleware --------------------------------------------------------
const corsOrigin =
  env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// --- Health -------------------------------------------------------------------
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Destow API', version: '1.0.0' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- JWKS (public keys for verifying access tokens; served through the gateway) -
app.get('/.well-known/jwks.json', async (_req, res) => res.json(await getJwks()));

// --- API routes (migrations run as a deploy step, not on the request path) -----
app.use('/api/v1', v1Router);

// --- 404 + error handler --------------------------------------------------------
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found', code: 'not_found' }));
app.use(errorHandler);

// --- HTTP server (Socket.io will attach here for real-time) --------------------
const server = http.createServer(app);
const PORT = Number(env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`Destow API on http://localhost:${PORT}`);
});

export { app, server };
