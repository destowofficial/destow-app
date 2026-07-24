import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  VEHICLE_CATEGORY,
  USER_ROLE,
  apiErrorSchema,
  apiSuccessSchema,
  ERROR_CODE,
} from '../src/index';

describe('@destow/contracts enums', () => {
  it('booking status has the full lifecycle', () => {
    expect(BOOKING_STATUS).toEqual([
      'pending',
      'confirmed',
      'assigned',
      'ongoing',
      'completed',
      'cancelled',
    ]);
  });

  it('payment, vehicle, and role enums expose expected values', () => {
    expect(PAYMENT_STATUS).toContain('paid');
    expect(VEHICLE_CATEGORY).toEqual(['car', 'bus']);
    expect(USER_ROLE).toEqual(['customer', 'provider', 'admin']);
  });

  it('enum arrays are usable as z.enum', () => {
    const schema = z.enum(BOOKING_STATUS);
    expect(schema.safeParse('completed').success).toBe(true);
    expect(schema.safeParse('nope').success).toBe(false);
  });
});

describe('@destow/contracts envelope', () => {
  it('apiSuccessSchema validates a typed success payload', () => {
    const schema = apiSuccessSchema(z.object({ id: z.string() }));
    expect(schema.safeParse({ success: true, data: { id: 'x' } }).success).toBe(true);
    expect(schema.safeParse({ success: false, error: 'no' }).success).toBe(false);
  });

  it('apiErrorSchema accepts a known error code and rejects unknown ones', () => {
    expect(apiErrorSchema.safeParse({ success: false, error: 'nope', code: 'not_found' }).success).toBe(true);
    expect(apiErrorSchema.safeParse({ success: false, error: 'nope', code: 'banana' }).success).toBe(false);
  });

  it('exposes a stable set of error codes', () => {
    expect(ERROR_CODE).toContain('validation_error');
    expect(ERROR_CODE).toContain('unauthorized');
  });
});
