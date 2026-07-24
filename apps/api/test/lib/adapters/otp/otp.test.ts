import { describe, it, expect, afterEach } from 'bun:test';

// These modules import config/env.ts, which parses process.env as it loads, so a
// minimal valid baseline has to exist first. The channel wiring under test is
// then configured explicitly (createOtpRegistry / provider constructors) rather
// than read from the environment, so these tests don't depend on load order.
process.env.DATABASE_URL ||= 'postgres://destow:pw@localhost:5432/destow';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';

const { WhatsAppCloudProvider } = await import('@/lib/adapters/otp/whatsapp.js');
const { TelegramGatewayProvider } = await import('@/lib/adapters/otp/telegram.js');
const { createOtpRegistry } = await import('@/lib/adapters/otp/index.js');
const { safeError } = await import('@/lib/log/safe.js');

const PHONE = '+919876543210';
const CODE = '123456';

const whatsapp = new WhatsAppCloudProvider({
  apiVersion: 'v21.0',
  phoneNumberId: 'PNID',
  accessToken: 'WA_SECRET_TOKEN',
  templateName: 'destow_otp',
  templateLang: 'en',
});
const telegram = new TelegramGatewayProvider({
  gatewayToken: 'TG_SECRET_TOKEN',
  senderUsername: undefined,
});

// Mirrors the recommended production setup: both channels on, WhatsApp default
// and fallback.
const registry = createOtpRegistry({
  channels: ['whatsapp', 'telegram'],
  defaultChannel: 'whatsapp',
  fallbackChannel: 'whatsapp',
  providers: { whatsapp, telegram },
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

interface Call {
  url: string;
  body: Record<string, unknown>;
}

// Swap global fetch for a router keyed on URL, recording what each provider sent.
function mockFetch(handler: (url: string) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: unknown, init: { body?: string } = {}) => {
    calls.push({ url: String(input), body: JSON.parse(init.body ?? '{}') });
    return handler(String(input));
  }) as unknown as typeof fetch;
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const isTelegram = (url: string) => url.includes('gatewayapi.telegram.org');

describe('WhatsAppCloudProvider', () => {
  it('posts the AUTHENTICATION template with the code in body and button', async () => {
    const calls = mockFetch(() => json({ messages: [{ id: 'wamid.X' }] }));
    await whatsapp.sendOtp(PHONE, CODE);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://graph.facebook.com/v21.0/PNID/messages');
    const body = calls[0]!.body as Record<string, any>;
    expect(body.to).toBe('919876543210'); // E.164 digits, no '+'
    expect(body.template.name).toBe('destow_otp');
    expect(body.template.components[0].parameters[0].text).toBe(CODE);
    expect(body.template.components[1].parameters[0].text).toBe(CODE);
  });

  it('fails without leaking the response body or our access token', async () => {
    mockFetch(() =>
      json(
        {
          error: {
            message: 'Invalid OAuth access token WA_SECRET_TOKEN for user 12345',
            type: 'OAuthException',
            code: 190,
          },
        },
        401,
      ),
    );

    const err = await whatsapp.sendOtp(PHONE, CODE).catch((e: unknown) => e);
    const logged = safeError(err);

    expect(logged).toBe('OtpSendError(whatsapp/401/OAuthException:190)');
    expect(logged).not.toContain('WA_SECRET_TOKEN');
    expect((err as Error).message).not.toContain('WA_SECRET_TOKEN');
    expect((err as Error).message).not.toContain('Invalid OAuth');
  });
});

describe('TelegramGatewayProvider', () => {
  it('posts to the Gateway with an E.164 number, our code and a matching ttl', async () => {
    const calls = mockFetch(() => json({ ok: true, result: { request_id: 'r1' } }));
    await telegram.sendOtp(PHONE, CODE);

    expect(calls[0]!.url).toBe('https://gatewayapi.telegram.org/sendVerificationMessage');
    expect(calls[0]!.body.phone_number).toBe(PHONE); // keeps the leading '+'
    expect(calls[0]!.body.code).toBe(CODE);
    expect(calls[0]!.body.ttl).toBe(300);
  });

  it('treats a 200 with { ok: false } as a failure', async () => {
    mockFetch(() => json({ ok: false, error: 'PHONE_NUMBER_INVALID' }, 200));
    const err = await telegram.sendOtp(PHONE, CODE).catch((e: unknown) => e);
    expect(safeError(err)).toBe('OtpSendError(telegram/200/PHONE_NUMBER_INVALID)');
  });
});

describe('deliverOtp', () => {
  it('reports the channel that accepted the message', async () => {
    mockFetch(() => json({ ok: true, messages: [] }));
    expect(await registry.deliverOtp(PHONE, CODE, 'whatsapp')).toBe('whatsapp');
    expect(await registry.deliverOtp(PHONE, CODE, 'telegram')).toBe('telegram');
  });

  it('falls back to WhatsApp when the picked channel errors at send time', async () => {
    const calls = mockFetch((url) =>
      isTelegram(url)
        ? json({ ok: false, error: 'PHONE_NUMBER_INVALID' }, 400)
        : json({ messages: [] }),
    );

    expect(await registry.deliverOtp(PHONE, CODE, 'telegram')).toBe('whatsapp');
    expect(calls).toHaveLength(2); // telegram attempt, then the whatsapp fallback
    expect(isTelegram(calls[0]!.url)).toBe(true);
    expect(isTelegram(calls[1]!.url)).toBe(false);
  });

  it('throws when the primary and the fallback both fail', async () => {
    mockFetch(() => json({ error: { type: 'OAuthException', code: 190 } }, 500));
    const err = await registry.deliverOtp(PHONE, CODE, 'telegram').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(safeError(err)).toContain('OtpSendError(whatsapp/500');
  });

  it('does not retry the same channel when it is also the fallback', async () => {
    const calls = mockFetch(() => json({ error: { type: 'OAuthException', code: 190 } }, 500));
    await registry.deliverOtp(PHONE, CODE, 'whatsapp').catch(() => undefined);
    expect(calls).toHaveLength(1);
  });
});

describe('registry', () => {
  it('exposes only the enabled channels and the resolved default', () => {
    expect(registry.enabledChannels).toEqual(['whatsapp', 'telegram']);
    expect(registry.defaultChannel).toBe('whatsapp');
  });

  it('gates client-supplied channels against the enabled set', () => {
    expect(registry.isChannelEnabled('telegram')).toBe(true);
    expect(registry.isChannelEnabled('log')).toBe(false); // known channel, not enabled here
    expect(registry.isChannelEnabled('carrier-pigeon')).toBe(false);
  });
});
