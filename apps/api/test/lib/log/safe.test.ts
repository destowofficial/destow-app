import { describe, it, expect } from 'bun:test';
import { safeError, shortCode, maskPhone } from '@/lib/log/safe';

describe('safeError', () => {
  it('never leaks the error message or its stack', () => {
    // A pg/redis failure typically echoes the host, and sometimes the password.
    const err = new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2');
    const out = safeError(err);
    expect(out).toBe('Error');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('10.0.0.5');
    expect(out).not.toContain('ECONNREFUSED'); // only from .code, not the message
  });

  it('keeps a node errno so outages are still triageable', () => {
    const err = Object.assign(new Error('nope'), { code: 'ECONNREFUSED' });
    expect(safeError(err)).toBe('Error(ECONNREFUSED)');
  });

  it('uses the curated label when an error provides one', () => {
    const err = Object.assign(new Error('raw upstream body with a token'), {
      name: 'OtpSendError',
      logSafeMessage: 'OtpSendError(whatsapp/401/OAuthException:190)',
    });
    expect(safeError(err)).toBe('OtpSendError(whatsapp/401/OAuthException:190)');
  });

  it('drops a code that is not token-shaped', () => {
    const err = Object.assign(new Error('x'), { code: 'Bearer sk-live-abc123 leaked' });
    expect(safeError(err)).toBe('Error');
  });

  it('handles non-Error throws', () => {
    expect(safeError('a raw string')).toBe('UnknownError');
    expect(safeError(undefined)).toBe('UnknownError');
  });
});

describe('shortCode', () => {
  it('keeps short upstream status tokens', () => {
    expect(shortCode('PHONE_NUMBER_INVALID')).toBe('PHONE_NUMBER_INVALID');
    expect(shortCode('  OAuthException:190  ')).toBe('OAuthException:190');
    expect(shortCode(190)).toBe('190');
  });

  it('drops a JSON body outright instead of mangling it', () => {
    // The danger: stripping punctuation would keep "InvalidOAuthaccesstokenABC123".
    expect(shortCode('{"error":{"message":"Invalid OAuth access token ABC123"}}')).toBeUndefined();
    expect(shortCode('Invalid OAuth access token ABC123')).toBeUndefined();
  });

  it('drops empty and over-long values', () => {
    expect(shortCode('')).toBeUndefined();
    expect(shortCode('A'.repeat(41))).toBeUndefined();
    expect(shortCode(undefined)).toBeUndefined();
  });
});

describe('maskPhone', () => {
  it('keeps only the last 4 digits', () => {
    expect(maskPhone('+919876543210')).toBe('***3210');
    expect(maskPhone('9876543210')).toBe('***3210');
  });

  it('does not partially reveal a very short value', () => {
    expect(maskPhone('123')).toBe('***');
  });
});
