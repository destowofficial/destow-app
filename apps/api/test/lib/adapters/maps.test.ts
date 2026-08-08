import { describe, it, expect, afterEach } from 'bun:test';

process.env.DATABASE_URL ||= 'postgres://destow:pw@localhost:5432/destow';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';
process.env.OTP_HMAC_SECRET ||= 'test_otp_hmac_at_least_32_characters_long';
process.env.ALLOW_EPHEMERAL_JWT_KEYS ||= 'true';

const { GoogleDistanceProvider, StubDistanceProvider } = await import('@/lib/adapters/maps.js');

// The real provider, driven by a stubbed fetch: the parsing, status handling and
// error mapping under test are exactly the code a live key would run. Distance
// multiplies straight into every fare and every commission, so this is the one
// integration where a "we'll check it in production" bug is expensive.
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: URL | string) => {
    calls.push(String(url));
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    } as Response;
  }) as typeof fetch;
  return calls;
}

const okBody = (m: number, s: number) => ({
  status: 'OK',
  rows: [{ elements: [{ status: 'OK', distance: { value: m }, duration: { value: s } }] }],
});

async function expectStatus(p: Promise<unknown>, status: number) {
  let err: unknown;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  expect((err as { status?: number })?.status).toBe(status);
  return err;
}

describe('GoogleDistanceProvider', () => {
  const provider = new GoogleDistanceProvider('test-key');

  it('returns metres and seconds straight from the response', async () => {
    mockFetch(okBody(305_400, 21_600));
    expect(await provider.distance('Delhi', 'Agra')).toEqual({
      distanceM: 305_400,
      durationS: 21_600,
    });
  });

  it('asks for driving directions biased to India', async () => {
    const calls = mockFetch(okBody(1000, 60));
    await provider.distance('Agra', 'Delhi');
    const url = new URL(calls[0]);
    expect(url.searchParams.get('mode')).toBe('driving');
    // "Agra" must resolve to Uttar Pradesh, not a same-named town elsewhere.
    expect(url.searchParams.get('region')).toBe('in');
    expect(url.searchParams.get('origins')).toBe('Agra');
    expect(url.searchParams.get('destinations')).toBe('Delhi');
  });

  // The failure mode this guards: the request succeeds while the only element
  // did not, so reading the outer status alone yields an undefined distance.
  it('checks the element status, not just the request status', async () => {
    mockFetch({ status: 'OK', rows: [{ elements: [{ status: 'ZERO_RESULTS' }] }] });
    const err = await expectStatus(provider.distance('Delhi', 'Atlantis'), 422);
    expect(JSON.stringify((err as { details: unknown }).details)).toMatch(/no driving route/i);
  });

  it('reports an unfindable place as a 422 the customer can act on', async () => {
    mockFetch({ status: 'OK', rows: [{ elements: [{ status: 'NOT_FOUND' }] }] });
    await expectStatus(provider.distance('Nowhere', 'Delhi'), 422);
  });

  // Quota and key problems are ours, not the customer's, and retrying is
  // reasonable - so 503 rather than a 4xx blaming them.
  it('treats quota exhaustion as a 503', async () => {
    mockFetch({ status: 'OVER_QUERY_LIMIT' });
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);
  });

  it('treats a denied request as a 503', async () => {
    mockFetch({ status: 'REQUEST_DENIED', error_message: 'API key not authorized' });
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);
  });

  it('treats a transport failure as a 503', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);
  });

  it('treats a non-200 as a 503', async () => {
    mockFetch({}, { ok: false, status: 500 });
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);
  });

  // A malformed payload must never become a zero-distance quote - that is a
  // free trip, and the fare engine would happily multiply it out.
  it('refuses a response with no usable distance rather than quoting zero', async () => {
    mockFetch({ status: 'OK', rows: [{ elements: [{ status: 'OK', duration: { value: 60 } }] }] });
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);

    mockFetch({
      status: 'OK',
      rows: [{ elements: [{ status: 'OK', distance: { value: 0 }, duration: { value: 0 } }] }],
    });
    await expectStatus(provider.distance('Delhi', 'Agra'), 503);
  });

  it('never lets the API key reach an error message', async () => {
    mockFetch({ status: 'REQUEST_DENIED', error_message: 'key AIzaSyTOPSECRET is invalid' });
    const err = await expectStatus(provider.distance('Delhi', 'Agra'), 503);
    expect(JSON.stringify(err)).not.toMatch(/AIzaSy|test-key/);
  });
});

describe('StubDistanceProvider', () => {
  const stub = new StubDistanceProvider();

  // A quote and the fare frozen at booking must agree, so the same route has to
  // give the same answer every time.
  it('is stable for a given route', async () => {
    const a = await stub.distance('Delhi', 'Manali');
    const b = await stub.distance('Delhi', 'Manali');
    expect(b).toEqual(a);
  });

  it('gives different routes different distances', async () => {
    const a = await stub.distance('Delhi', 'Manali');
    const b = await stub.distance('Mumbai', 'Pune');
    expect(a.distanceM).not.toBe(b.distanceM);
  });

  it('produces whole metres in a plausible outstation range', async () => {
    const { distanceM, durationS } = await stub.distance('Delhi', 'Jaipur');
    expect(Number.isInteger(distanceM)).toBe(true);
    expect(distanceM).toBeGreaterThanOrEqual(120_000);
    expect(distanceM).toBeLessThanOrEqual(800_000);
    expect(durationS).toBeGreaterThan(0);
  });
});
