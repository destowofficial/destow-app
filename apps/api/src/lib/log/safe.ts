// Log redaction. Everything written to the logs must be safe for whoever ends up
// holding them: no env values, no credentials, no upstream response bodies, no
// stack traces. Error messages routinely carry exactly those - a pg error echoes
// the connection target, a provider error echoes its response body, a stack
// exposes the internals - so errors are reduced to a coarse label before they
// are logged. Operators still get the error's type and errno, which is enough to
// triage alongside the log prefix and /metrics.

// Keep an upstream's short status token (e.g. 'PHONE_NUMBER_INVALID',
// 'OAuthException:190') and nothing else. Anything prose- or JSON-shaped is
// dropped entirely rather than stripped down: a stripped body still leaks
// fragments of whatever credential or recipient it happened to contain.
export function shortCode(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const token = String(value).trim();
  return token.length > 0 && token.length <= 40 && /^[A-Za-z0-9_.:-]+$/.test(token)
    ? token
    : undefined;
}

// A stable, non-identifying label for an error - never its message or stack.
// Errors we construct ourselves can opt into a curated label via `logSafeMessage`
// (see OtpSendError), which is the only string taken verbatim.
export function safeError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { name?: unknown; code?: unknown; logSafeMessage?: unknown };
    if (typeof e.logSafeMessage === 'string') return e.logSafeMessage;
    const name = shortCode(e.name) ?? 'Error';
    const code = shortCode(e.code);
    return code ? `${name}(${code})` : name;
  }
  return 'UnknownError';
}

// A phone number identifies a person, so logs keep only enough of it to
// correlate lines. The full number still goes to the auth_events audit table,
// which is access-controlled - unlike stdout.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length <= 4 ? '***' : `***${digits.slice(-4)}`;
}
