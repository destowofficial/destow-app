import { z } from 'zod';
import { AppError } from './errors.js';

// Parse `data` with a zod schema or throw a 422 AppError carrying the field-error map.
// Controllers use it directly on req.body / req.query.
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    // formErrors carries object-level failures from .refine() - e.g. "provide at
    // least one field". Dropping them leaves the client a 422 with an empty
    // details object and nothing to act on.
    const { fieldErrors, formErrors } = result.error.flatten();
    throw AppError.unprocessable('Validation failed', {
      ...fieldErrors,
      ...(formErrors.length > 0 ? { _errors: formErrors } : {}),
    });
  }
  return result.data;
}

// Express 5 types a route param as string | string[]. Beyond narrowing it, this
// rejects a malformed id here rather than letting Postgres reject it later:
// `WHERE id = 'nope'` raises invalid-input-syntax, which surfaces as a 500 for
// what is really a bad request.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidParam(value: unknown, name = 'id'): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== 'string' || !UUID_RE.test(v)) {
    throw AppError.badRequest(`Invalid ${name}`);
  }
  return v;
}
