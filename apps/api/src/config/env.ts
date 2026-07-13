// Bun loads .env automatically - no dotenv needed.
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  // SSL mode for the pg pool. Unset -> prod defaults to 'no-verify', else 'disable'.
  // Use 'require' + NODE_EXTRA_CA_CERTS (RDS CA bundle) for verified TLS in prod.
  DATABASE_SSL: z.enum(['disable', 'require', 'no-verify']).optional(),
  // HMAC secret for hashing OTP codes at rest (not used for JWT signing anymore).
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AWS_REGION: z.string().default('ap-south-1'),
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

  // Optional integrations - validated only when present.
  MAPS_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

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
  return data;
}

export const env = parseEnv();
