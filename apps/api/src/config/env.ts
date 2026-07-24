// Bun loads .env automatically - no dotenv needed.
import { z } from 'zod';
import { OTP_CHANNEL, type OtpChannel } from '@destow/contracts';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  // SSL mode for the pg pool. Unset -> prod defaults to 'no-verify', else 'disable'.
  // Use 'require' + NODE_EXTRA_CA_CERTS (RDS CA bundle) for verified TLS in prod.
  DATABASE_SSL: z.enum(['disable', 'require', 'no-verify']).optional(),
  // HMAC secret for hashing OTP codes at rest (not used for JWT signing anymore).
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGINS: z.string().default('*'), // '*' or comma-separated origins

  // --- Sessions / tokens (design A: EdDSA access JWT + rotating refresh) -------
  // Ed25519 keypair (PEM or base64-PEM). Optional in dev/test (an ephemeral
  // keypair is generated at boot); REQUIRED in production.
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_KID: z.string().default('dev'),
  JWT_ISSUER: z.string().default('destow'),
  JWT_AUDIENCE: z.string().default('destow-app'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(600), // 10 min
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),

  // --- Redis (denylist + rate limiting) ---------------------------------------
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // --- OTP rate limiting ------------------------------------------------------
  OTP_RESEND_COOLDOWN_SEC: z.coerce.number().int().positive().default(60),
  OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(5),

  // --- OTP delivery channels --------------------------------------------------
  // Comma-separated channels this deployment offers, e.g. "whatsapp,telegram".
  // Only these get a provider instance and only these are accepted by
  // request-otp. Split + validated in parseEnv (see resolveOtpChannels).
  OTP_CHANNELS: z.string().default('log'),
  // Channel used when the client doesn't pick one. Defaults to the first enabled.
  OTP_DEFAULT_CHANNEL: z.enum(OTP_CHANNEL).optional(),
  // Tried when the picked channel throws at send time. Must also be enabled.
  OTP_FALLBACK_CHANNEL: z.enum(OTP_CHANNEL).optional(),

  // WhatsApp Cloud API (Meta) - required when 'whatsapp' is enabled.
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().default('destow_otp'),
  WHATSAPP_TEMPLATE_LANG: z.string().default('en'),

  // Telegram Gateway API - required when 'telegram' is enabled.
  TELEGRAM_GATEWAY_TOKEN: z.string().optional(),
  TELEGRAM_SENDER_USERNAME: z.string().optional(),

  // Optional integrations - validated only when present.
  MAPS_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

// OTP_CHANNELS arrives as a comma-separated string but the rest of the app wants
// a validated list, and the default channel is resolved (not raw), so Env
// narrows both fields.
export type Env = Omit<z.infer<typeof envSchema>, 'OTP_CHANNELS' | 'OTP_DEFAULT_CHANNEL'> & {
  OTP_CHANNELS: OtpChannel[];
  OTP_DEFAULT_CHANNEL: OtpChannel;
};

// "whatsapp, telegram" -> ['whatsapp','telegram'], rejecting unknown names so a
// typo fails at boot instead of silently disabling a channel.
function parseOtpChannels(raw: string): [OtpChannel, ...OtpChannel[]] {
  const parts = raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const unknown = parts.filter((c) => !(OTP_CHANNEL as readonly string[]).includes(c));
  if (unknown.length > 0) {
    throw new Error(
      `OTP_CHANNELS has unknown channel(s): ${unknown.join(', ')}. Valid: ${OTP_CHANNEL.join(', ')}`,
    );
  }
  const [first, ...rest] = [...new Set(parts as OtpChannel[])];
  if (!first) throw new Error('OTP_CHANNELS must list at least one channel');
  return [first, ...rest];
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = JSON.stringify(parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  const data = parsed.data;
  // In production the signing keypair must be provided (no ephemeral keys).
  if (data.NODE_ENV === 'production' && (!data.JWT_PRIVATE_KEY || !data.JWT_PUBLIC_KEY)) {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production');
  }

  const channels = parseOtpChannels(data.OTP_CHANNELS);
  // Never silently print OTP codes to the log in production.
  if (data.NODE_ENV === 'production' && channels.includes('log')) {
    throw new Error('OTP_CHANNELS must not include "log" in production');
  }
  // Every enabled channel must have its credentials, so we never construct a
  // provider that cannot send.
  if (
    channels.includes('whatsapp') &&
    (!data.WHATSAPP_PHONE_NUMBER_ID || !data.WHATSAPP_ACCESS_TOKEN)
  ) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required when "whatsapp" is in OTP_CHANNELS',
    );
  }
  if (channels.includes('telegram') && !data.TELEGRAM_GATEWAY_TOKEN) {
    throw new Error('TELEGRAM_GATEWAY_TOKEN is required when "telegram" is in OTP_CHANNELS');
  }
  // The default and the fallback must themselves be enabled channels.
  const defaultChannel = data.OTP_DEFAULT_CHANNEL ?? channels[0];
  if (!channels.includes(defaultChannel)) {
    throw new Error(
      `OTP_DEFAULT_CHANNEL "${defaultChannel}" is not in OTP_CHANNELS (${channels.join(', ')})`,
    );
  }
  if (data.OTP_FALLBACK_CHANNEL && !channels.includes(data.OTP_FALLBACK_CHANNEL)) {
    throw new Error(
      `OTP_FALLBACK_CHANNEL "${data.OTP_FALLBACK_CHANNEL}" is not in OTP_CHANNELS (${channels.join(', ')})`,
    );
  }

  return { ...data, OTP_CHANNELS: channels, OTP_DEFAULT_CHANNEL: defaultChannel };
}

export const env = parseEnv();
