import { defineConfig } from 'vitest/config';

// Test env points at the isolated docker test DB (compose `db-test`, port 5435).
// These are local, non-secret credentials — safe to commit so tests are reproducible.
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://destow:destow_local@localhost:5435/destow_test',
      JWT_SECRET: 'test_jwt_secret_value_at_least_32_characters_long',
      JWT_EXPIRES_IN: '1h',
      AWS_REGION: 'ap-south-1',
    },
    include: ['src/**/*.test.ts'],
    // Integration tests share one test DB → run files serially so they don't race.
    pool: 'forks',
    fileParallelism: false,
  },
});
