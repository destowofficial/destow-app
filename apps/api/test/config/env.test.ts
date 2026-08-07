import { describe, it, expect } from 'bun:test';

// config/env.ts parses process.env at import time, so give it a valid baseline
// before the module loads; the assertions below call parseEnv() with explicit
// sources rather than relying on the ambient environment.
process.env.DATABASE_URL ||= 'postgres://destow:pw@localhost:5432/destow';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';
const { parseEnv } = await import('@/config/env.js');

const base = {
  DATABASE_URL: 'postgres://destow:pw@localhost:5432/destow',
  JWT_SECRET: 'test_secret_at_least_32_characters_long',
} as NodeJS.ProcessEnv;

const whatsappCreds = {
  WHATSAPP_PHONE_NUMBER_ID: 'pnid',
  WHATSAPP_ACCESS_TOKEN: 'token',
};

describe('parseEnv - OTP channels', () => {
  it('defaults to the dev log channel', () => {
    const env = parseEnv({ ...base });
    expect(env.OTP_CHANNELS).toEqual(['log']);
    expect(env.OTP_DEFAULT_CHANNEL).toBe('log');
  });

  it('splits a comma-separated list and defaults to the first channel', () => {
    const env = parseEnv({
      ...base,
      ...whatsappCreds,
      OTP_CHANNELS: 'whatsapp, telegram',
      TELEGRAM_GATEWAY_TOKEN: 'tg',
    });
    expect(env.OTP_CHANNELS).toEqual(['whatsapp', 'telegram']);
    expect(env.OTP_DEFAULT_CHANNEL).toBe('whatsapp');
  });

  it('de-duplicates repeated channels', () => {
    const env = parseEnv({ ...base, OTP_CHANNELS: 'log,log' });
    expect(env.OTP_CHANNELS).toEqual(['log']);
  });

  it('rejects a typo rather than silently disabling a channel', () => {
    expect(() => parseEnv({ ...base, OTP_CHANNELS: 'whatsap' })).toThrow(/unknown channel/i);
  });

  it('rejects an empty channel list', () => {
    expect(() => parseEnv({ ...base, OTP_CHANNELS: ' , ' })).toThrow(/at least one channel/i);
  });
});

describe('parseEnv - channel credentials', () => {
  it('requires WhatsApp credentials when whatsapp is enabled', () => {
    expect(() => parseEnv({ ...base, OTP_CHANNELS: 'whatsapp' })).toThrow(
      /WHATSAPP_PHONE_NUMBER_ID/,
    );
  });

  it('requires the gateway token when telegram is enabled', () => {
    expect(() => parseEnv({ ...base, OTP_CHANNELS: 'telegram' })).toThrow(
      /TELEGRAM_GATEWAY_TOKEN/,
    );
  });
});

describe('parseEnv - default and fallback must be enabled', () => {
  it('rejects a default channel that is not enabled', () => {
    expect(() =>
      parseEnv({
        ...base,
        ...whatsappCreds,
        OTP_CHANNELS: 'whatsapp',
        OTP_DEFAULT_CHANNEL: 'telegram',
      }),
    ).toThrow(/OTP_DEFAULT_CHANNEL/);
  });

  it('rejects a fallback channel that is not enabled', () => {
    expect(() =>
      parseEnv({
        ...base,
        ...whatsappCreds,
        OTP_CHANNELS: 'whatsapp',
        OTP_FALLBACK_CHANNEL: 'telegram',
      }),
    ).toThrow(/OTP_FALLBACK_CHANNEL/);
  });
});

describe('parseEnv - production guards', () => {
  const prod = {
    ...base,
    NODE_ENV: 'production',
    JWT_PRIVATE_KEY: 'private',
    JWT_PUBLIC_KEY: 'public',
  } as NodeJS.ProcessEnv;

  it('never lets production print OTP codes to the log', () => {
    expect(() => parseEnv({ ...prod, OTP_CHANNELS: 'log' })).toThrow(/must not include "log"/i);
  });

  it('still requires the signing keypair in production', () => {
    expect(() =>
      parseEnv({ ...base, NODE_ENV: 'production', ...whatsappCreds, OTP_CHANNELS: 'whatsapp' }),
    ).toThrow(/JWT_PRIVATE_KEY/);
  });

  it('accepts a real production channel setup', () => {
    const env = parseEnv({
      ...prod,
      ...whatsappCreds,
      TELEGRAM_GATEWAY_TOKEN: 'tg',
      OTP_CHANNELS: 'whatsapp,telegram',
      OTP_FALLBACK_CHANNEL: 'whatsapp',
    });
    expect(env.OTP_DEFAULT_CHANNEL).toBe('whatsapp');
    expect(env.OTP_FALLBACK_CHANNEL).toBe('whatsapp');
  });
});
