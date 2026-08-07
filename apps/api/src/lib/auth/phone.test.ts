import { describe, it, expect } from 'bun:test';
import { canonicalizePhone } from './phone';

describe('canonicalizePhone', () => {
  // Every one of these is the same person. The old normalizePhone() returned any
  // '+'-prefixed input verbatim, so they became separate rows on a unique column.
  const equivalent = [
    '9876543210',
    '+919876543210',
    '+91 98765 43210',
    '+91-98765-43210',
    '98765 43210',
    '  9876543210  ',
  ];

  for (const input of equivalent) {
    it(`canonicalizes ${JSON.stringify(input)} to +919876543210`, () => {
      expect(canonicalizePhone(input)).toBe('+919876543210');
    });
  }

  const rejected = [
    ['', 'empty'],
    ['12345', 'too short'],
    ['abcdefghij', 'not numeric'],
    ['1234567890', 'Indian mobiles start 6-9'],
    ['+9876543210', 'not a valid number in any region'],
  ] as const;

  for (const [input, why] of rejected) {
    it(`rejects ${JSON.stringify(input)} (${why})`, () => {
      expect(() => canonicalizePhone(input)).toThrow();
    });
  }

  it('rejects with a 422 AppError carrying a field error', () => {
    try {
      canonicalizePhone('nope');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as { status: number }).status).toBe(422);
      expect((err as { details: { phone: string[] } }).details.phone.length).toBeGreaterThan(0);
    }
  });
});
