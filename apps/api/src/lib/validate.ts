import { z } from 'zod';
import { AppError } from './errors.js';

// Parse `data` with a zod schema or throw a 422 AppError carrying the field-error map.
// Controllers use it directly on req.body / req.query.
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.unprocessable('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}
