import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseOrThrow } from './validate';
import { AppError } from './errors';

const schema = z.object({ name: z.string().min(1), age: z.number().int() });

describe('parseOrThrow', () => {
  it('returns typed data on success', () => {
    expect(parseOrThrow(schema, { name: 'Ada', age: 3 })).toEqual({ name: 'Ada', age: 3 });
  });

  it('throws a 422 AppError with the field-error map on failure', () => {
    let caught: unknown;
    try {
      parseOrThrow(schema, { name: '', age: 1.5 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AppError);
    const err = caught as AppError;
    expect(err.status).toBe(422);
    expect(err.code).toBe('validation_error');
    expect(err.details).toHaveProperty('name');
    expect(err.details).toHaveProperty('age');
  });
});
