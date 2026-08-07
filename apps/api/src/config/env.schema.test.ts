import { describe, it, expect } from 'bun:test';
import { parseEnv } from './env.schema';

// A minimal valid environment. Each test overrides exactly one key so every
// assertion is about a single variable.
const base: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/destow',
  JWT_SECRET: 'x'.repeat(32),
  ALLOW_EPHEMERAL_JWT_KEYS: 'true',
};

const withKeys: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/destow',
  JWT_SECRET: 'x'.repeat(32),
  JWT_PRIVATE_KEY: 'pem',
  JWT_PUBLIC_KEY: 'pem',
};

describe('parseEnv dev-affordance flags', () => {
  it('defaults every dev affordance to off', () => {
    const env = parseEnv(base);
    expect(env.OTP_DEV_ECHO).toBe(false);
    expect(env.ALLOW_INSECURE_COOKIES).toBe(false);
    expect(env.ALLOW_WILDCARD_CORS).toBe(false);
  });

  // The reason envBool exists: z.coerce.boolean()('false') is true, which would
  // silently switch on every affordance this table keeps off.
  it('parses the string "false" as false', () => {
    expect(parseEnv({ ...base, OTP_DEV_ECHO: 'false' }).OTP_DEV_ECHO).toBe(false);
    expect(parseEnv({ ...base, OTP_DEV_ECHO: 'FALSE' }).OTP_DEV_ECHO).toBe(false);
    expect(parseEnv({ ...base, OTP_DEV_ECHO: '0' }).OTP_DEV_ECHO).toBe(false);
  });

  it('parses true forms as true', () => {
    expect(parseEnv({ ...base, OTP_DEV_ECHO: 'true' }).OTP_DEV_ECHO).toBe(true);
    expect(parseEnv({ ...base, OTP_DEV_ECHO: '1' }).OTP_DEV_ECHO).toBe(true);
  });

  it('rejects an ambiguous boolean instead of guessing', () => {
    expect(() => parseEnv({ ...base, OTP_DEV_ECHO: 'yes' })).toThrow(/OTP_DEV_ECHO/);
  });
});

describe('parseEnv production guards', () => {
  it('refuses to boot with a dev affordance enabled in production', () => {
    expect(() =>
      parseEnv({ ...withKeys, NODE_ENV: 'production', OTP_DEV_ECHO: 'true' }),
    ).toThrow(/OTP_DEV_ECHO/);
  });

  it('names every enabled affordance in the failure', () => {
    expect(() =>
      parseEnv({
        ...withKeys,
        NODE_ENV: 'production',
        OTP_DEV_ECHO: 'true',
        ALLOW_WILDCARD_CORS: 'true',
      }),
    ).toThrow(/ALLOW_WILDCARD_CORS/);
  });

  it('requires a signing keypair unless ephemeral keys are opted into', () => {
    const noKeys = { DATABASE_URL: base.DATABASE_URL, JWT_SECRET: base.JWT_SECRET };
    expect(() => parseEnv(noKeys)).toThrow(/JWT_PRIVATE_KEY/);
  });

  // The old guard keyed off NODE_ENV, so a staging box that forgot to set it
  // booted on throwaway keys. This one does not care what NODE_ENV says.
  it('requires a keypair even when NODE_ENV is development', () => {
    expect(() => parseEnv({ ...base, ALLOW_EPHEMERAL_JWT_KEYS: 'false' })).toThrow(
      /JWT_PRIVATE_KEY/,
    );
  });

  it('accepts a real keypair with no flag set', () => {
    expect(parseEnv(withKeys).ALLOW_EPHEMERAL_JWT_KEYS).toBe(false);
  });

  it('rejects wildcard CORS unless explicitly allowed', () => {
    expect(() => parseEnv({ ...base, CORS_ORIGINS: '*' })).toThrow(/ALLOW_WILDCARD_CORS/);
  });

  it('permits wildcard CORS when explicitly allowed', () => {
    expect(
      parseEnv({ ...base, CORS_ORIGINS: '*', ALLOW_WILDCARD_CORS: 'true' }).CORS_ORIGINS,
    ).toBe('*');
  });
});
