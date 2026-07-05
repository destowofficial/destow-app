import type { Context } from 'hono';
import { z } from 'zod';
import { AppError } from './errors.js';

// Parse `data` with a zod schema or throw a 422 AppError carrying the field-error map.
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.unprocessable('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

// Read + validate a JSON body (guards against malformed JSON → 400 instead of a 500).
export async function parseJsonBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw AppError.badRequest('Invalid JSON body');
  }
  return parseOrThrow(schema, body);
}

// Validate query params.
export function parseQuery<T extends z.ZodTypeAny>(c: Context, schema: T): z.infer<T> {
  return parseOrThrow(schema, c.req.query());
}
