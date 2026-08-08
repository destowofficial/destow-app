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
