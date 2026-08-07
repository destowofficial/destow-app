import { describe, it, expect } from 'bun:test';

// config/env.ts parses process.env at import time, so give it a valid baseline
// before the module loads; the assertions below call parseEnv() with explicit
// sources rather than relying on the ambient environment.
process.env.DATABASE_URL ||= 'postgres://destow:pw@localhost:5432/destow';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';
const { parseEnv, channelsWithCredentials } = await import('@/config/env.js');

// A minimal *valid* environment: parseEnv requires the OTP hashing key and
// refuses to boot without a signing keypair unless ephemeral keys are opted in.
const base = {
  DATABASE_URL: 'postgres://destow:pw@localhost:5432/destow',
  JWT_SECRET: 'test_secret_at_least_32_characters_long',
  OTP_HMAC_SECRET: 'test_otp_hmac_at_least_32_characters_long',
  ALLOW_EPHEMERAL_JWT_KEYS: 'true',
} as NodeJS.ProcessEnv;

const whatsappCreds = {
  WHATSAPP_PHONE_NUMBER_ID: 'pnid',
  WHATSAPP_ACCESS_TOKEN: 'token',
};

// env no longer decides WHICH channels are on - that is an admin setting in
// platform_settings. It decides only which ones are *possible*, by whether their
// credentials are present, so a channel can never be switched on into a provider
// that has no way to send.
describe('channelsWithCredentials', () => {
  it('offers nothing when no credentials are configured', () => {
    expect(channelsWithCredentials(parseEnv({ ...base, ALLOW_LOG_OTP_CHANNEL: 'false' }))).toEqual([]);
  });

  it('offers whatsapp only when both of its credentials are present', () => {
    const partial = parseEnv({ ...base, WHATSAPP_PHONE_NUMBER_ID: 'pnid', ALLOW_LOG_OTP_CHANNEL: 'false' });
    expect(channelsWithCredentials(partial)).not.toContain('whatsapp');

    const full = parseEnv({ ...base, ...whatsappCreds, ALLOW_LOG_OTP_CHANNEL: 'false' });
    expect(channelsWithCredentials(full)).toContain('whatsapp');
  });

  it('offers telegram when the gateway token is present', () => {
    const env = parseEnv({ ...base, TELEGRAM_GATEWAY_TOKEN: 'tg', ALLOW_LOG_OTP_CHANNEL: 'false' });
    expect(channelsWithCredentials(env)).toEqual(['telegram']);
  });

  // 'log' has its own flag rather than riding on OTP_DEV_ECHO: printing the code
  // to server stdout and returning it in the HTTP response are different
  // exposures, and either can be wanted without the other.
  it('offers the log channel only when ALLOW_LOG_OTP_CHANNEL is on', () => {
    expect(channelsWithCredentials(parseEnv({ ...base, ALLOW_LOG_OTP_CHANNEL: 'false' }))).not.toContain(
      'log',
    );
    expect(channelsWithCredentials(parseEnv({ ...base, ALLOW_LOG_OTP_CHANNEL: 'true' }))).toContain('log');
  });

  // The guard that makes the whole arrangement safe: production refuses the
  // log-channel flag at boot, so 'log' can never be available there and
  // no admin toggle can turn it on.
  it('cannot offer the log channel in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_EPHEMERAL_JWT_KEYS: 'false',
        JWT_PRIVATE_KEY: 'private',
        JWT_PUBLIC_KEY: 'public',
        ALLOW_LOG_OTP_CHANNEL: 'true',
      }),
    ).toThrow(/ALLOW_LOG_OTP_CHANNEL/);
  });
});

describe('parseEnv - production guards', () => {
  it('still requires the signing keypair in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_EPHEMERAL_JWT_KEYS: 'false',
        ...whatsappCreds,
      }),
    ).toThrow(/JWT_PRIVATE_KEY/);
  });

  it('accepts a real production setup', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      ALLOW_EPHEMERAL_JWT_KEYS: 'false',
      JWT_PRIVATE_KEY: 'private',
      JWT_PUBLIC_KEY: 'public',
      ...whatsappCreds,
      TELEGRAM_GATEWAY_TOKEN: 'tg',
    });
    expect(channelsWithCredentials(env)).toEqual(['whatsapp', 'telegram']);
  });
});
