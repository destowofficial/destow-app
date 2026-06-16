import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { AppError, appErrorHandler } from './errors';

describe('AppError', () => {
  it('factories set the right status and code', () => {
    expect(AppError.notFound().status).toBe(404);
    expect(AppError.notFound().code).toBe('not_found');
    expect(AppError.unauthorized().status).toBe(401);
    expect(AppError.conflict('dup').code).toBe('conflict');
    expect(AppError.rateLimited().status).toBe(429);
    expect(AppError.unprocessable('bad', { a: ['x'] }).details).toEqual({ a: ['x'] });
  });
});

describe('appErrorHandler', () => {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.get('/notfound', () => {
    throw AppError.notFound('nope');
  });
  app.get('/invalid', () => {
    throw AppError.unprocessable('bad', { name: ['Required'] });
  });
  app.get('/boom', () => {
    throw new Error('kaboom');
  });

  it('maps an AppError to the envelope with its code', async () => {
    const res = await app.request('/notfound');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'nope', code: 'not_found' });
  });

  it('includes field details for validation errors', async () => {
    const res = await app.request('/invalid');
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string; details: unknown };
    expect(body.code).toBe('validation_error');
    expect(body.details).toEqual({ name: ['Required'] });
  });

  it('maps an unknown error to 500 internal without leaking it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Internal server error', code: 'internal' });
    spy.mockRestore();
  });
});
