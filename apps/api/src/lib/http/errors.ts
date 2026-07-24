import type { Request, Response, NextFunction } from 'express';
import { safeError } from '../log/safe.js';
import type { ErrorCode } from '@destow/contracts';

type HttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

// Typed application error. Services throw it; the Express error handler maps it
// to the standard envelope. Avoids ad-hoc `throw new Error(...)`.
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
  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new AppError(503, 'service_unavailable', message);
  }
}

// Express error-handling middleware (must keep 4 args). Single place the error
// envelope is built. Express 5 forwards rejected async handlers here.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  console.error(`[Unhandled Error] ${safeError(err)}`);
  res.status(500).json({ success: false, error: 'Internal server error', code: 'internal' });
}
