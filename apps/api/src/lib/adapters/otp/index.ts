import { safeError } from '../../log/safe.js';
import {
  getOtpSettings,
  type OtpDeliverySettings,
} from '../../../services/settings/otp-settings.service.js';
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

// --- The application-wide registry -------------------------------------------
// Built from platform_settings rather than env, so an admin switching provider
// takes effect without a redeploy. Rebuilt only when the resolved settings
// actually change: constructing providers on every send would be wasteful, and
// caching forever would ignore the toggle.
let current: { signature: string; registry: OtpRegistry } | null = null;

function signatureOf(s: OtpDeliverySettings): string {
  return `${[...s.channels].sort().join(',')}|${s.defaultChannel}|${s.fallbackChannel ?? ''}`;
}

async function activeRegistry(): Promise<{ registry: OtpRegistry; settings: OtpDeliverySettings }> {
  const settings = await getOtpSettings();
  const signature = signatureOf(settings);
  if (!current || current.signature !== signature) {
    current = { signature, registry: createOtpRegistry(settings) };
  }
  return { registry: current.registry, settings };
}

// The channels a client may choose from, and the one used when it doesn't.
export async function getEnabledChannels(): Promise<{
  channels: OtpChannel[];
  defaultChannel: OtpChannel;
}> {
  const { settings } = await activeRegistry();
  return { channels: settings.channels, defaultChannel: settings.defaultChannel };
}

// Deliver over `channel`, or over the admin-configured default when omitted.
// Returns the channel that actually accepted the message.
export async function deliverOtp(
  phone: string,
  code: string,
  channel?: OtpChannel,
): Promise<OtpChannel> {
  const { registry, settings } = await activeRegistry();
  const target = channel ?? settings.defaultChannel;
  if (!registry.isChannelEnabled(target)) {
    throw new Error(`OTP channel '${target}' is not enabled`);
  }
  return registry.deliverOtp(phone, code, target);
}
