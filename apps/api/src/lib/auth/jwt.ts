import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { privateKey, publicKey, kid } from './keys.js';

// Access-token claims we rely on. `sid` ties the token to a server session so a
// single Redis denylist entry can revoke every access token for that session.
export interface AccessClaims {
  sub: string; // userId
  sid: string; // sessionId
  role: string;
  jti: string;
  exp: number;
}

export async function signAccessToken(input: {
  userId: string;
  sessionId: string;
  role: string;
}): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = crypto.randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((issuedAt + env.ACCESS_TOKEN_TTL_SEC) * 1000);
  const token = await new SignJWT({ sid: input.sessionId, role: input.role })
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setSubject(input.userId)
    .setJti(jti)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + env.ACCESS_TOKEN_TTL_SEC)
    .sign(privateKey);
  return { token, jti, expiresAt };
}

// Verifies signature, expiry, issuer, audience, and pins alg to EdDSA
// (rejects alg-confusion / alg:none). Throws on any failure.
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ['EdDSA'],
  });
  return {
    sub: payload.sub as string,
    sid: payload.sid as string,
    role: payload.role as string,
    jti: payload.jti as string,
    exp: payload.exp as number,
  };
}
