// Preloaded before unit tests so modules that read config/env.ts at import time
// can be imported at all. Never overwrites a value the caller already set - the
// integration run supplies its own DATABASE_URL, REDIS_URL and NODE_ENV.
process.env.DATABASE_URL ??= 'postgres://destow:destow@localhost:5432/destow_unit';
process.env.JWT_SECRET ??= 'unit_test_jwt_secret_at_least_32_characters';
process.env.OTP_HMAC_SECRET ??= 'unit_test_otp_hmac_secret_at_least_32_chars';
process.env.ALLOW_EPHEMERAL_JWT_KEYS ??= 'true';
process.env.CORS_ORIGINS ??= '';
