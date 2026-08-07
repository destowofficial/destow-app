import { describe, it, expect } from 'bun:test';
import type { Request, Response, NextFunction } from 'express';
import { requireRole, requireClient } from '@/middleware/auth/auth.js';

// Minimal fakes - these gates read only req.user and call next().
function reqWith(user?: { id: string; role: string; client: string }) {
  return { user } as unknown as Request;
}
const res = {} as Response;

function run(mw: (r: Request, s: Response, n: NextFunction) => void, req: Request) {
  let called = false;
  mw(req, res, () => {
    called = true;
  });
  return called;
}

const customer = { id: 'u1', role: 'customer', client: 'customer_app' };
const provider = { id: 'u2', role: 'provider', client: 'provider_app' };
const admin = { id: 'u3', role: 'admin', client: 'admin_web' };

describe('requireRole', () => {
  it('admits a matching role', () => {
    expect(run(requireRole('customer'), reqWith(customer))).toBe(true);
  });

  it('admits any of several roles', () => {
    expect(run(requireRole('admin', 'provider'), reqWith(provider))).toBe(true);
  });

  it('rejects a non-matching role', () => {
    expect(() => run(requireRole('admin'), reqWith(customer))).toThrow(/permission/i);
  });

  it('rejects an unauthenticated request', () => {
    expect(() => run(requireRole('customer'), reqWith(undefined))).toThrow();
  });
});

describe('requireClient', () => {
  it('admits the named client', () => {
    expect(run(requireClient('provider_app'), reqWith(provider))).toBe(true);
  });

  // The point of the audience claim: a customer token is inert on partner routes
  // even though both users authenticate the same way.
  it('rejects a customer_app token on a provider_app route', () => {
    expect(() => run(requireClient('provider_app'), reqWith(customer))).toThrow();
  });

  it('rejects a provider_app token on a customer_app route', () => {
    expect(() => run(requireClient('customer_app'), reqWith(provider))).toThrow();
  });

  it('composes with requireRole for admin routes', () => {
    expect(run(requireClient('admin_web'), reqWith(admin))).toBe(true);
    expect(run(requireRole('admin'), reqWith(admin))).toBe(true);
  });
});
