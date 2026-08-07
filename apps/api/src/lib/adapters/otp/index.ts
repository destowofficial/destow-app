import { env } from '../../../config/env.js';
import { safeError } from '../../log/safe.js';
import type { OtpChannel, OtpDeliveryProvider } from './types.js';
import { WhatsAppCloudProvider } from './whatsapp.js';
import { TelegramGatewayProvider } from './telegram.js';
import { LogProvider } from './log.js';

export type { OtpChannel } from './types.js';

// One factory per known channel. Add 'sms' here (and to OTP_CHANNEL in contracts
// plus a provider file) when a gateway is chosen - nothing else changes.
const FACTORIES: Record<OtpChannel, () => OtpDeliveryProvider> = {
  whatsapp: () => new WhatsAppCloudProvider(),
  telegram: () => new TelegramGatewayProvider(),
  log: () => new LogProvider(),
};

export interface OtpRegistryConfig {
  channels: OtpChannel[];
  defaultChannel: OtpChannel;
  fallbackChannel?: OtpChannel;
  // Explicit providers, for callers that don't want the env-configured ones.
  providers?: Partial<Record<OtpChannel, OtpDeliveryProvider>>;
}

export interface OtpRegistry {
  enabledChannels: OtpChannel[];
  defaultChannel: OtpChannel;
  isChannelEnabled(channel: string): channel is OtpChannel;
  deliverOtp(phone: string, code: string, channel: OtpChannel): Promise<OtpChannel>;
}

// Builds a delivery registry over an explicit config. The app uses the env-backed
// instance below; taking config as an argument keeps the channel wiring free of
// load-order coupling and lets it be exercised directly.
export function createOtpRegistry(config: OtpRegistryConfig): OtpRegistry {
  const { channels, defaultChannel, fallbackChannel } = config;

  // Instantiate only the enabled channels - env validation already guaranteed
  // each enabled channel has its creds, so we never build a provider that
  // cannot send.
  const providers = new Map<OtpChannel, OtpDeliveryProvider>(
    channels.map((c) => [c, config.providers?.[c] ?? FACTORIES[c]()]),
  );

  function isChannelEnabled(channel: string): channel is OtpChannel {
    return providers.has(channel as OtpChannel);
  }

  // Deliver `code` to `phone` over `channel`; on a send-time error fall back to
  // the configured fallback channel (when set and different). Returns the channel
  // that actually delivered, and throws if primary and fallback both fail.
  //
  // Note: a provider resolving means the message was *accepted* upstream, not
  // confirmed *delivered* - so fallback fires only on send-time errors. True
  // "accepted but never delivered" fallback needs provider delivery webhooks.
  async function deliverOtp(phone: string, code: string, channel: OtpChannel): Promise<OtpChannel> {
    const primary = providers.get(channel);
    if (!primary) throw new Error(`No OTP provider for channel '${channel}'`);

    try {
      await primary.sendOtp(phone, code);
      return channel;
    } catch (err) {
      const fallback =
        fallbackChannel && fallbackChannel !== channel ? providers.get(fallbackChannel) : undefined;
      if (!fallbackChannel || !fallback) throw err;
      console.error(
        `[otp] ${channel} send failed, falling back to ${fallbackChannel}: ${safeError(err)}`,
      );
      await fallback.sendOtp(phone, code); // propagates if the fallback also fails
      return fallbackChannel;
    }
  }

  return { enabledChannels: channels, defaultChannel, isChannelEnabled, deliverOtp };
}

// The application-wide registry, configured from the validated environment.
const registry = createOtpRegistry({
  channels: env.OTP_CHANNELS,
  defaultChannel: env.OTP_DEFAULT_CHANNEL,
  fallbackChannel: env.OTP_FALLBACK_CHANNEL,
});

export const enabledChannels = registry.enabledChannels;
export const defaultChannel = registry.defaultChannel;
export const isChannelEnabled = registry.isChannelEnabled;
export const deliverOtp = registry.deliverOtp;
