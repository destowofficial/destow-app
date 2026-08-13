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

// The whole outbound journey, stop by stop.
//
// A hire that calls at Shimla on the way to Manali is one booking priced on the
// distance it actually covers, so the legs are summed rather than the endpoints
// measured: Delhi->Shimla plus Shimla->Manali is meaningfully longer than
// Delhi->Manali, and quoting the direct line would undercharge every trip with
// a stop on it.
//
// Each leg goes through resolveDistance, so legs are cached and shared with
// plain point-to-point quotes - the Delhi->Shimla leg costs nothing once
// somebody has already asked for Delhi to Shimla.
//
// Sequential on purpose. Firing the legs in parallel would be faster, but two
// requests for the same uncached leg would both miss and both bill; a booking
// with three stops is four calls at most, and correctness is worth the
// milliseconds here.
export async function resolveJourney(
  from: string,
  stops: string[],
  to: string,
): Promise<DistanceResult> {
  const points = [from, ...stops, to];
  let distanceM = 0;
  let durationS = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const leg = await resolveDistance(points[i]!, points[i + 1]!);
    distanceM += leg.distanceM;
    durationS += leg.durationS;
  }

  return { distanceM, durationS };
}
