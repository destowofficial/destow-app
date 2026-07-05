import type { Context } from 'hono';
import type { ErrorCode } from '@destow/contracts';

type HttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

// Typed application error. Services throw it; the global handler maps it to the
// standard envelope. Avoids ad-hoc `throw new Error(...)` with lost status/code.
export class AppError extends Error {
  readonly status: HttpErrorStatus;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: HttpErrorStatus, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'validation_error', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'unauthorized', message);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, 'forbidden', message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, 'not_found', message);
  }
  static conflict(message: string) {
    return new AppError(409, 'conflict', message);
  }
  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, 'validation_error', message, details);
  }
  static rateLimited(message = 'Too many requests') {
    return new AppError(429, 'rate_limited', message);
  }
}

// Hono global error handler — single place the envelope is built for errors.
export function appErrorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      err.status,
    );
  }
  console.error('[Unhandled Error]', err);
  return c.json({ success: false, error: 'Internal server error', code: 'internal' }, 500);
}
