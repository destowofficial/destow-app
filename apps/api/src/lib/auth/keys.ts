import crypto from 'node:crypto';
import { exportJWK, type JWK } from 'jose';
import { env } from '../../config/env.js';

// Ed25519 signing keys for the access-token JWTs. The PRIVATE key signs only in
// the auth path; everyone else (gateway, socket layer, future services) verifies
// with the PUBLIC key via the JWKS endpoint. Asymmetric signing kills the whole
// class of shared-secret-leak and alg-confusion attacks and lets keys rotate by
// `kid` with no downtime.

// Accept either raw PEM or base64-encoded PEM (env vars dislike newlines).
function normalizePem(raw: string): string {
  const s = raw.trim();
  return s.includes('BEGIN') ? s : Buffer.from(s, 'base64').toString('utf8');
}

function loadKeys(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    return {
      privateKey: crypto.createPrivateKey(normalizePem(env.JWT_PRIVATE_KEY)),
      publicKey: crypto.createPublicKey(normalizePem(env.JWT_PUBLIC_KEY)),
    };
  }
  // parseEnv() already refuses to boot here unless ALLOW_EPHEMERAL_JWT_KEYS is
  // explicitly set, so reaching this branch is always a deliberate local choice.
  if (!env.ALLOW_EPHEMERAL_JWT_KEYS) {
    throw new Error('No signing keypair and ALLOW_EPHEMERAL_JWT_KEYS is not set');
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  console.warn(
    '[auth] ALLOW_EPHEMERAL_JWT_KEYS - generated a throwaway Ed25519 keypair (tokens invalidate on restart).',
  );
  return { privateKey, publicKey };
}

const keys = loadKeys();
export const privateKey = keys.privateKey;
export const publicKey = keys.publicKey;
export const kid = env.JWT_KID;

// JWKS for GET /.well-known/jwks.json - cached (the public key never changes at runtime).
let jwksCache: { keys: JWK[] } | null = null;
export async function getJwks(): Promise<{ keys: JWK[] }> {
  if (!jwksCache) {
    const jwk = await exportJWK(publicKey);
    jwksCache = { keys: [{ ...jwk, kid, use: 'sig', alg: 'EdDSA' }] };
  }
  return jwksCache;
}
