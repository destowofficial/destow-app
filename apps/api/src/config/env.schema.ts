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
  ALLOW_LOG_OTP_CHANNEL: envBool(false), // offer the 'log' channel (prints to stdout)
  ALLOW_EPHEMERAL_JWT_KEYS: envBool(false), // boot without a real signing keypair
  ALLOW_INSECURE_COOKIES: envBool(false), // drop Secure on the refresh cookie
  ALLOW_WILDCARD_CORS: envBool(false), // permit CORS_ORIGINS='*'

  // --- OTP delivery credentials -----------------------------------------------
  // env supplies only the secrets. WHICH channels are live, and which is default
  // or fallback, lives in platform_settings so an admin can switch provider with
  // no redeploy. A channel is selectable only if its credentials are present
  // here - see channelsWithCredentials().

  // WhatsApp Cloud API (Meta).
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().default('destow_otp'),
  WHATSAPP_TEMPLATE_LANG: z.string().default('en'),

  // Telegram Gateway API.
  TELEGRAM_GATEWAY_TOKEN: z.string().optional(),
  TELEGRAM_SENDER_USERNAME: z.string().optional(),

  // --- Admin bootstrap --------------------------------------------------------
  // All three together create the first admin, once, if no admin exists. Leave
  // unset after the first deploy - the seed is a no-op when an admin is present.
  ADMIN_PHONE: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().optional(),

  // Optional integrations - validated only when present.
  MAPS_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Signs webhook bodies. Separate from the key secret in Razorpay's dashboard,
  // so a leaked webhook secret cannot also create orders.
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Which channels this deployment *could* run, judged purely on whether their
// credentials are present. platform_settings decides which are actually on, and
// may only choose from this set - so a misconfigured secret surfaces as "not
// selectable" rather than as a provider that accepts a send and never delivers.
//
// 'log' prints the code to stdout, so it needs no credentials but is a dev
// affordance with its own flag - deliberately separate from OTP_DEV_ECHO, which
// governs returning the code in the HTTP response. They are different exposures
// and either can be wanted without the other. parseEnv refuses both in production.
export function channelsWithCredentials(source: Env): OtpChannel[] {
  const available: OtpChannel[] = [];
  if (source.WHATSAPP_PHONE_NUMBER_ID && source.WHATSAPP_ACCESS_TOKEN) available.push('whatsapp');
  if (source.TELEGRAM_GATEWAY_TOKEN) available.push('telegram');
  if (source.ALLOW_LOG_OTP_CHANNEL) available.push('log');
  return available;
}

const DEV_ONLY_FLAGS = [
  'OTP_DEV_ECHO',
  'ALLOW_LOG_OTP_CHANNEL',
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

  // Channel selection is no longer validated here - it lives in
  // platform_settings and is resolved against channelsWithCredentials() at
  // delivery time, so an admin toggle needs no redeploy.
  return data;
}
