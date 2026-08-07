import { describe, it, expect } from 'bun:test';
import { decodeJwt, SignJWT } from 'jose';
import { signAccessToken, verifyAccessToken } from './jwt';
import { privateKey, kid } from './keys';
import { env } from '../../config/env';

const base = { userId: 'u-1', sessionId: 's-1', role: 'customer' } as const;

describe('access token audience', () => {
  it('stamps the client as the audience', async () => {
    const { token } = await signAccessToken({ ...base, client: 'customer_app' });
    expect(decodeJwt(token).aud).toBe('customer_app');
  });

  it('round-trips the client through verification', async () => {
    const { token } = await signAccessToken({
      userId: 'u-2',
      sessionId: 's-2',
      role: 'provider',
      client: 'provider_app',
    });
    const claims = await verifyAccessToken(token);
    expect(claims.aud).toBe('provider_app');
    expect(claims.role).toBe('provider');
    expect(claims.sub).toBe('u-2');
    expect(claims.sid).toBe('s-2');
  });

  // Sign with the real key but the audience the old code used. A correctly
  // signed token is still rejected purely because its audience is not a client,
  // which is also what makes every pre-existing token invalid after this change.
  it('rejects a validly-signed token whose audience is not a client', async () => {
    const rogue = await new SignJWT({ sid: 's-3', role: 'admin' })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setSubject('u-3')
      .setJti('j-3')
      .setIssuer(env.JWT_ISSUER)
      .setAudience('destow-app')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(privateKey);
    await expect(verifyAccessToken(rogue)).rejects.toThrow();
  });
});
