import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './lib/http/errors.js';
import { getJwks } from './lib/auth/keys.js';
import { metricsMiddleware } from './middleware/metrics/metrics.js';
import { metricsText, metricsContentType } from './lib/metrics/metrics.js';
import { v1Router } from './v1/index.js';
import { pool } from './db/connection.js';
import { redis } from './db/redis.js';
import { safeError } from './lib/log/safe.js';

const app: express.Express = express();

// How much of X-Forwarded-For to believe. Behind the gateway this must be 1:
// Caddy APPENDS the real client IP, so Express reads past any header the caller
// invented and lands on the genuine one - a spoofed "X-Forwarded-For: 1.2.3.4"
// becomes "1.2.3.4, <real>" and the real address still wins.
//
// With nothing in front, that protection disappears and the header is entirely
// attacker-controlled, which would let anyone rotate their own rate-limit key.
// Setting TRUST_PROXY_HOPS=0 makes Express ignore the header and use the socket
// peer instead. Note the OTP limits that guard SMS spend key on the phone
// number, not the IP, so they never depended on this.
app.set('trust proxy', env.TRUST_PROXY_HOPS);

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

// --- Shutdown -----------------------------------------------------------------
// A container is stopped by SIGTERM. Without handling it the process dies mid
// request: a customer's booking insert is cut off, a payment confirmation never
// returns, and the Postgres pool leaves connections for the server to time out.
// Stop accepting new work, let what is in flight finish, then close the pool and
// Redis.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return; // a second Ctrl-C should not race the first
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining`);

  // Force-exit if a request hangs; a stuck process is worse than a cut-off one,
  // because the orchestrator waits for it before starting the replacement.
  const forced = setTimeout(() => {
    console.error('[shutdown] drain timed out, exiting');
    process.exit(1);
  }, 10_000);
  forced.unref();

  server.close(async () => {
    try {
      await pool.end();
      await redis.quit();
    } catch (err) {
      console.error(`[shutdown] cleanup failed: ${safeError(err)}`);
    }
    clearTimeout(forced);
    console.log('[shutdown] done');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// An unhandled rejection is a bug we have not seen yet. Log it with the full
// context rather than letting the default handler print a bare trace - and do
// not exit: killing the process on one bad promise turns a single failed
// request into an outage for everyone mid-flight.
process.on('unhandledRejection', (reason) => {
  console.error(`[fatal] unhandled rejection: ${safeError(reason)}`);
});

// An uncaught exception, by contrast, means the process is in an unknown state.
// Log and let it die so the orchestrator restarts something healthy.
process.on('uncaughtException', (err) => {
  console.error(`[fatal] uncaught exception: ${safeError(err)}`);
  process.exit(1);
});

export { app, server };
