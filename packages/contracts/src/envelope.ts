import { z } from 'zod';

// Standard API response envelope (matches apps/api response helpers).
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; code?: ErrorCode };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Machine-readable error codes shared by server + clients.
export const ERROR_CODE = [
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'service_unavailable',
  'internal',
] as const;
export type ErrorCode = (typeof ERROR_CODE)[number];

// Zod schemas so clients can parse/validate responses if they choose.
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.enum(ERROR_CODE).optional(),
});

export function apiSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ success: z.literal(true), data });
}
