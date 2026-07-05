// Bun loads .env automatically - no dotenv needed.
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  // SSL mode for the pg pool. Unset -> prod defaults to 'no-verify', else 'disable'.
  // Use 'require' + NODE_EXTRA_CA_CERTS (RDS CA bundle) for verified TLS in prod.
  DATABASE_SSL: z.enum(['disable', 'require', 'no-verify']).optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AWS_REGION: z.string().default('ap-south-1'),
  CORS_ORIGINS: z.string().default('*'), // '*' or comma-separated origins
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
  return parsed.data;
}

export const env = parseEnv();
