import { maps, type DistanceResult } from './maps.js';
import { redis, observeRedis } from '../../db/redis.js';
import { safeError } from '../log/safe.js';

// A cached wrapper over the distance provider. Two reasons, both load-bearing:
//
//  1. Consistency. The quote a customer sees and the fare frozen onto their
//     booking must come from the same distance. A real provider can return
//     slightly different values for the same route between calls, and any drift
//     shows up as "the price changed while I was booking".
//  2. Cost. Distance Matrix is billed per request, and outstation traffic is
//     concentrated on a handful of city pairs (Delhi-Manali and friends), so the
//     hit rate is high.
//
// Direction is part of the key: A->B and B->A are not always the same road.
const TTL_SEC = 24 * 60 * 60;

function routeKey(from: string, to: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return `route:${norm(from)}|${norm(to)}`;
}

export async function resolveDistance(from: string, to: string): Promise<DistanceResult> {
  const key = routeKey(from, to);

  try {
    const cached = await observeRedis('get', () => redis.get(key));
    if (cached) {
      const parsed = JSON.parse(cached) as DistanceResult;
      if (Number.isInteger(parsed.distanceM) && parsed.distanceM > 0) return parsed;
    }
  } catch (err) {
    // A cache miss must never fail a quote - fall through to the provider.
    console.error(`[route] cache read failed, falling through: ${safeError(err)}`);
  }

  const result = await maps.distance(from, to);

  try {
    await observeRedis('set', () => redis.set(key, JSON.stringify(result), 'EX', TTL_SEC));
  } catch (err) {
    console.error(`[route] cache write failed: ${safeError(err)}`);
  }

  return result;
}
