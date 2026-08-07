import { Redis } from 'ioredis';
import { safeError } from '../lib/log/safe.js';
import { env } from '../config/env.js';

// Redis pub/sub for cross-replica fan-out. This is what lets the API scale to
// multiple replicas: an event published on one instance reaches subscribers on
// every instance. A connection in subscribe mode cannot run normal commands, so
// pub/sub uses its OWN two connections, separate from the main `redis` client
// (which handles the denylist + rate limits).
//
// It backs the upcoming Socket.io Redis adapter (real-time tracking) and any
// cross-replica signal (e.g. "kick this session's live sockets").

const publisher = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });
const subscriber = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });

publisher.on('error', (e) => console.error(`[pubsub] publisher error: ${safeError(e)}`));
subscriber.on('error', (e) => console.error(`[pubsub] subscriber error: ${safeError(e)}`));

type Handler = (payload: unknown, channel: string) => void;
const handlers = new Map<string, Set<Handler>>();

subscriber.on('message', (channel, message) => {
  const set = handlers.get(channel);
  if (!set) return;
  let payload: unknown;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = message;
  }
  for (const handler of set) {
    try {
      handler(payload, channel);
    } catch (err) {
      console.error(`[pubsub] handler error on ${channel}: ${safeError(err)}`);
    }
  }
});

// Publish a JSON payload to a channel (fans out to every replica's subscribers).
export async function publish(channel: string, payload: unknown): Promise<void> {
  await publisher.publish(channel, JSON.stringify(payload));
}

// Subscribe a handler to a channel. Returns an unsubscribe function.
export async function subscribe(
  channel: string,
  handler: Handler,
): Promise<() => Promise<void>> {
  let set = handlers.get(channel);
  if (!set) {
    set = new Set();
    handlers.set(channel, set);
    await subscriber.subscribe(channel);
  }
  set.add(handler);
  return async () => {
    set.delete(handler);
    if (set.size === 0) {
      handlers.delete(channel);
      await subscriber.unsubscribe(channel);
    }
  };
}

// Graceful shutdown: close both pub/sub connections.
export async function closePubSub(): Promise<void> {
  await Promise.allSettled([publisher.quit(), subscriber.quit()]);
}
