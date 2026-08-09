import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './lib/http/errors.js';
import { getJwks } from './lib/auth/keys.js';
import { metricsMiddleware } from './middleware/metrics/metrics.js';
import { metricsText, metricsContentType } from './lib/metrics/metrics.js';
import { v1Router } from './v1/index.js';

const app: express.Express = express();

// Behind the Caddy gateway: trust its X-Forwarded-For so req.ip is the real
// client IP (per-IP rate limits and session.ip records depend on this). '1' =
// exactly one proxy hop (the gateway).
app.set('trust proxy', 1);

// --- Global middleware --------------------------------------------------------
// A credentialed request forbids a wildcard origin, so the admin console needs a
// real allowlist and `origin: true` (reflect the caller) rather than '*'.
// parseEnv() rejects '*' unless ALLOW_WILDCARD_CORS is set, and defaults the list
// to empty. The mobile apps are native and send no Origin, so none of this
// affects them.
const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const corsOrigin =
  env.CORS_ORIGINS.trim() === '*' ? true : allowedOrigins.length > 0 ? allowedOrigins : false;
// Security headers, written out rather than pulled from helmet. This is a JSON
// API: most of helmet is HTML-oriented (CSP, COEP/CORP) and would be switched
// off anyway, leaving six headers - not worth a dependency and a types cast for
// Express 5. Stating them here also makes it obvious what we actually send.
app.disable('x-powered-by'); // stop advertising the framework and its version
app.use((_req, res, next) => {
  // Browsers ignore HSTS over plain HTTP, so this is inert locally and takes
  // effect once Caddy terminates TLS.
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Responses are JSON; never let a browser guess otherwise and execute one.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Nothing here is meant to be framed, and a framed API response is only ever
  // part of someone else's attack.
  res.setHeader('X-Frame-Options', 'DENY');
  // Paths carry booking and user ids, so never leak them to a third party.
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(cors({ origin: corsOrigin, credentials: true }));
// Webhook signatures are computed over the exact bytes the gateway sent, so a
// re-serialized JSON object will not verify. Keep the raw body, but only for
// webhook paths - holding it for every request is needless memory.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (req.url?.includes('/webhooks/')) {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      }
    },
  }),
);
app.use(metricsMiddleware);

// --- Health -------------------------------------------------------------------
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Destow API', version: '1.0.0' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- JWKS (public keys for verifying access tokens; served through the gateway) -
app.get('/.well-known/jwks.json', async (_req, res) => res.json(await getJwks()));

// --- Metrics (Prometheus). Observability/internal — restrict /metrics at the
// gateway in prod so it is not publicly scrapeable.
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsContentType());
  res.send(await metricsText());
});

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
