import { z } from 'zod';
import { OTP_CHANNEL, type OtpChannel } from '@destow/contracts';

// A strict string->boolean parser. z.coerce.boolean() is unusable here: it maps
// the string "false" to `true`, which would silently switch on every dev
// affordance below. Anything ambiguous is a boot error rather than a guess.
const envBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return defaultValue;
      if (typeof value === 'boolean') return value;
      const normalized = value.trim().toLowerCase();
      if (normalized === '') return defaultValue;
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `expected true or false, received "${value}"`,
      });
      return z.NEVER;
    });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  // SSL mode for the pg pool. Unset -> prod defaults to 'no-verify', else 'disable'.
  // Use 'require' + NODE_EXTRA_CA_CERTS (RDS CA bundle) for verified TLS in prod.
  DATABASE_SSL: z.enum(['disable', 'require', 'no-verify']).optional(),
  // Retained only for pre-existing consumers; token signing uses the Ed25519 keypair.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Key separation: one secret, one job. Rotating the OTP key must not touch
  // anything else. Rotation invalidates in-flight OTPs, which is harmless at a
  // five-minute TTL.
  OTP_HMAC_SECRET: z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 characters'),
  AWS_REGION: z.string().default('ap-south-1'),
  // Comma-separated browser origins. Defaults to none: the mobile apps are
  // native and send no Origin, so an empty allowlist is fully functional and
  // denies by default. The admin console must list its origin explicitly.
  CORS_ORIGINS: z.string().default(''),

  // --- Sessions / tokens (EdDSA access JWT + rotating refresh) ----------------
  // Ed25519 keypair (PEM or base64-PEM). Required unless ALLOW_EPHEMERAL_JWT_KEYS.
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_KID: z.string().default('dev'),
  JWT_ISSUER: z.string().default('destow'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(600), // 10 min
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),

  // --- Redis (denylist + rate limiting) --------------------------------------
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // --- OTP rate limiting -----------------------------------------------------
  OTP_RESEND_COOLDOWN_SEC: z.coerce.number().int().positive().default(60),
  OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(5),

  // --- Development-only affordances ------------------------------------------
  // Each defaults to OFF and is checked on its own value, never on NODE_ENV, so
  // one forgotten variable can no longer grant several permissions at once.
  OTP_DEV_ECHO: envBool(false), // echo the OTP in the request-otp response
  ALLOW_EPHEMERAL_JWT_KEYS: envBool(false), // boot without a real signing keypair
  ALLOW_INSECURE_COOKIES: envBool(false), // drop Secure on the refresh cookie
  ALLOW_WILDCARD_CORS: envBool(false), // permit CORS_ORIGINS='*'

  // --- OTP delivery channels --------------------------------------------------
  // Comma-separated channels this deployment offers, e.g. "whatsapp,telegram".
  // Only these get a provider instance and only these are accepted by
  // request-otp. Split + validated below (see parseOtpChannels).
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

const DEV_ONLY_FLAGS = [
  'OTP_DEV_ECHO',
  'ALLOW_EPHEMERAL_JWT_KEYS',
  'ALLOW_INSECURE_COOKIES',
  'ALLOW_WILDCARD_CORS',
] as const;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = JSON.stringify(parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  const data = parsed.data;

  const enabled = DEV_ONLY_FLAGS.filter((flag) => data[flag]);
  if (data.NODE_ENV === 'production' && enabled.length > 0) {
    throw new Error(`Development-only flags must be off in production: ${enabled.join(', ')}`);
  }

  // Deliberately NOT keyed off NODE_ENV. The previous guard was, so a host that
  // forgot to set NODE_ENV=production booted on a throwaway keypair that
  // invalidated every token on restart.
  if (!data.ALLOW_EPHEMERAL_JWT_KEYS && (!data.JWT_PRIVATE_KEY || !data.JWT_PUBLIC_KEY)) {
    throw new Error(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required unless ALLOW_EPHEMERAL_JWT_KEYS=true',
    );
  }

  // A credentialed request forbids a wildcard origin outright, so this would
  // break the admin console silently rather than loudly.
  if (data.CORS_ORIGINS.trim() === '*' && !data.ALLOW_WILDCARD_CORS) {
    throw new Error("CORS_ORIGINS='*' requires ALLOW_WILDCARD_CORS=true");
  }

  // --- OTP delivery channels --------------------------------------------------
  const channels = parseOtpChannels(data.OTP_CHANNELS);

  // 'log' prints the code to stdout, so it is a dev affordance like the flags
  // above and is refused in production for the same reason.
  if (data.NODE_ENV === 'production' && channels.includes('log')) {
    throw new Error('OTP_CHANNELS must not include "log" in production');
  }

  // Every enabled channel must have its credentials, so we never construct a
  // provider that cannot send. When channel selection moves to platform_settings
  // this check moves with it - the admin endpoint must refuse to enable a
  // channel whose credentials are absent.
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
  const otpDefaultChannel = data.OTP_DEFAULT_CHANNEL ?? channels[0];
  if (!channels.includes(otpDefaultChannel)) {
    throw new Error(
      `OTP_DEFAULT_CHANNEL "${otpDefaultChannel}" is not in OTP_CHANNELS (${channels.join(', ')})`,
    );
  }
  if (data.OTP_FALLBACK_CHANNEL && !channels.includes(data.OTP_FALLBACK_CHANNEL)) {
    throw new Error(
      `OTP_FALLBACK_CHANNEL "${data.OTP_FALLBACK_CHANNEL}" is not in OTP_CHANNELS (${channels.join(', ')})`,
    );
  }

  return { ...data, OTP_CHANNELS: channels, OTP_DEFAULT_CHANNEL: otpDefaultChannel };
}
