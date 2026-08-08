import { AppError } from '../http/errors.js';

// argon2id via Bun's built-in - no native module to compile and no added
// supply-chain surface. Parameters are the OWASP minimum for argon2id.
const ARGON = { algorithm: 'argon2id', memoryCost: 19_456, timeCost: 2 } as const;

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

// A short denylist of the passwords that actually get tried first. Not a
// substitute for a breach corpus, but it costs nothing and blocks the obvious.
const COMMON = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'qwertyuiop', '123456789012',
  'administrator', 'adminadmin', 'admin1234567', 'letmein12345', 'welcome12345',
  'iloveyou1234', 'destowadmin', 'destow123456', 'changeme1234', 'qwerty123456',
]);

// NIST 800-63B: length and a blocklist, no composition rules. Forced symbol
// classes push people toward predictable substitutions without adding entropy.
export function assertPasswordPolicy(password: string): void {
  const issues: string[] = [];
  if (password.length < MIN_LENGTH) issues.push(`Must be at least ${MIN_LENGTH} characters`);
  if (password.length > MAX_LENGTH) issues.push(`Must be at most ${MAX_LENGTH} characters`);
  if (COMMON.has(password.toLowerCase())) issues.push('That password is too common');
  if (issues.length > 0) throw AppError.unprocessable('Validation failed', { password: issues });
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return Bun.password.hash(password, ARGON);
}

// A real argon2id verification against a throwaway hash, so an unknown email
// costs the same time as a known one. Computed once at module load: doing the
// work is the point, doing it repeatedly is not.
const DUMMY_HASH = await Bun.password.hash('destow-dummy-password-for-timing', ARGON);

// Returns false rather than throwing for a wrong password, so the caller decides
// what to tell the user - the answer must not differ by whether the account
// exists. Pass `undefined` for an unknown account to still burn the time.
export async function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  if (!hash) {
    await Bun.password.verify(password, DUMMY_HASH).catch(() => false);
    return false;
  }
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    return false; // malformed stored hash - treat as a failed attempt, never a 500
  }
}
