import type { Request, Response, NextFunction } from 'express';
import { incrWithTtl } from '../../db/redis.js';
import { AppError } from '../../lib/http/errors.js';
import { recordRateLimitEvent } from '../../lib/metrics/metrics.js';

// Generic Redis fixed-window limiter, keyed by client IP (behind the gateway,
// req.ip reflects X-Forwarded-For because index.ts sets 'trust proxy'). Coarse
// abuse guard on public endpoints; fine-grained per-identity limits live in the
// relevant service (e.g. per-phone OTP caps).
export function rateLimit(opts: { keyPrefix: string; max: number; windowSec: number }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? 'unknown';
    let count: number;
    try {
      count = await incrWithTtl(`rl:${opts.keyPrefix}:${ip}`, opts.windowSec);
    } catch (err) {
      // Fail-closed: if the limiter can't run, reject with 503 rather than let
      // an unbounded flood through (consistent with the auth denylist).
      console.error('[ratelimit] check failed (fail-closed):', (err as Error).message);
      recordRateLimitEvent(opts.keyPrefix, 'error');
      throw AppError.serviceUnavailable('Service temporarily unavailable');
    }
    if (count > opts.max) {
      recordRateLimitEvent(opts.keyPrefix, 'blocked');
      throw AppError.rateLimited('Too many requests - slow down');
    }
    recordRateLimitEvent(opts.keyPrefix, 'allowed');
    next();
  };
}
