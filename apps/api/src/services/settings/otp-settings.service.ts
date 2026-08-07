import type { OtpChannel } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { platformSettings } from '../../db/schema.js';
import { env, channelsWithCredentials } from '../../config/env.js';
import { safeError } from '../../lib/log/safe.js';

// Which channels are live, resolved from platform_settings (admin-controlled)
// and intersected with the credentials present in env. The database says what
// SHOULD be on; env decides what CAN be on; a channel needs both.
export interface OtpDeliverySettings {
  channels: OtpChannel[];
  defaultChannel: OtpChannel;
  fallbackChannel?: OtpChannel;
}

// A short TTL rather than pub/sub invalidation: an admin toggle takes effect
// within CACHE_TTL_MS on every instance, with no Postgres read on the OTP hot
// path and no coordination to get wrong. Long enough to be effectively free,
// short enough that nobody waits on a provider switch.
const CACHE_TTL_MS = 30_000;

let cache: { value: OtpDeliverySettings; expiresAt: number } | null = null;

// Last-resort settings when the row is missing or unreadable. Never invents a
// channel whose credentials are absent, so this can only ever narrow, and it
// yields an empty channel list rather than a broken provider.
function fallbackSettings(): OtpDeliverySettings {
  const available = channelsWithCredentials(env);
  return { channels: available, defaultChannel: available[0] ?? 'log' };
}

// Intersect the admin's choice with what is actually configured. A channel the
// admin enabled but whose credentials were later removed silently drops out
// here rather than failing at send time.
export function resolveSettings(
  row: { otpChannels: OtpChannel[]; otpDefaultChannel: OtpChannel; otpFallbackChannel: OtpChannel | null },
  available: OtpChannel[],
): OtpDeliverySettings {
  const channels = row.otpChannels.filter((c) => available.includes(c));

  // The stored default only stands if it survived the intersection; otherwise
  // fall through to the first surviving channel so delivery still works.
  const defaultChannel = channels.includes(row.otpDefaultChannel)
    ? row.otpDefaultChannel
    : (channels[0] ?? row.otpDefaultChannel);

  const fallbackChannel =
    row.otpFallbackChannel && channels.includes(row.otpFallbackChannel)
      ? row.otpFallbackChannel
      : undefined;

  return { channels, defaultChannel, fallbackChannel };
}

export async function getOtpSettings(): Promise<OtpDeliverySettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  let value: OtpDeliverySettings;
  try {
    const [row] = await db
      .select({
        otpChannels: platformSettings.otpChannels,
        otpDefaultChannel: platformSettings.otpDefaultChannel,
        otpFallbackChannel: platformSettings.otpFallbackChannel,
      })
      .from(platformSettings)
      .limit(1);
    value = row ? resolveSettings(row, channelsWithCredentials(env)) : fallbackSettings();
  } catch (err) {
    // Serving a slightly stale or env-only config beats failing every login
    // because the settings row was briefly unreadable.
    console.error(`[otp] could not read delivery settings, using env fallback: ${safeError(err)}`);
    value = cache?.value ?? fallbackSettings();
  }

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

// Called by the admin settings endpoint so a change is visible immediately on
// the instance that made it, rather than after the TTL. Other instances pick it
// up when their own entry expires.
export function invalidateOtpSettings(): void {
  cache = null;
}
