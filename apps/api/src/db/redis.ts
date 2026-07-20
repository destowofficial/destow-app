import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { observeAsync, redisCommandDuration, redisCommandsTotal } from '../lib/metrics/metrics.js';

// Hot-path store for the auth denylist (revocation) and rate-limit counters.
// Postgres remains the durable source of truth; Redis is a rebuildable cache.
// lazyConnect: don't dial Redis until the first command, so importing this
// module (e.g. in a unit test that never touches Redis) has no side effect.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
});

redis.on('error', (err) => console.error('[redis] error:', err.message));

// Fixed-window counter: INCR + EXPIRE run atomically inside Redis (single Lua
// eval), so there is no window where the key can be left without a TTL. The
// TTL < 0 guard also self-heals any pre-existing key that somehow lost its
// expiry, so a counter can never become a permanent lockout.
const INCR_WITH_TTL = `
  local n = redis.call('INCR', KEYS[1])
  if n == 1 or redis.call('TTL', KEYS[1]) < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return n
`;

export async function incrWithTtl(key: string, ttlSec: number): Promise<number> {
  return observeRedis('eval_incr_with_ttl', async () => (
    await redis.eval(INCR_WITH_TTL, 1, key, ttlSec)
  ) as number);
}

export async function observeRedis<T>(command: string, fn: () => Promise<T>): Promise<T> {
  return observeAsync(
    redisCommandDuration,
    redisCommandsTotal,
    { command },
    fn,
  );
}
