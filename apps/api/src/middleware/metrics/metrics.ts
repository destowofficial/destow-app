import type { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../../lib/metrics/metrics.js';

// Records request count + duration on response finish. Labels by the matched
// route PATTERN (e.g. /api/v1/auth/verify-otp), never the raw URL, so metric
// cardinality stays bounded. /metrics itself is skipped so scrapes don't
// inflate their own counters.
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationS = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path
      ? (req.baseUrl || '') + req.route.path
      : req.baseUrl || 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationS);
  });
  next();
}
