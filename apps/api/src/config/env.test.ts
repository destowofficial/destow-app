import { describe, it, expect } from 'vitest';
import { parseEnv } from './env';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/d',
  JWT_SECRET: '0123456789abcdef0123456789abcdef', // exactly 32 chars
} as NodeJS.ProcessEnv;

describe('env schema', () => {
  it('applies sensible defaults', () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe('3000');
    expect(env.AWS_REGION).toBe('ap-south-1');
    expect(env.CORS_ORIGINS).toBe('*');
    expect(env.JWT_EXPIRES_IN).toBe('7d');
  });

  it('rejects a JWT_SECRET shorter than 32 chars', () => {
    expect(() => parseEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('requires DATABASE_URL to be a valid URL', () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: 'not-a-url' })).toThrow();
  });

  it('validates DATABASE_SSL only against allowed modes', () => {
    expect(parseEnv({ ...base, DATABASE_SSL: 'require' }).DATABASE_SSL).toBe('require');
    expect(() => parseEnv({ ...base, DATABASE_SSL: 'bogus' as never })).toThrow();
  });
});
