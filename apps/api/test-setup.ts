// Preloaded before unit tests so modules that read config/env.ts at import time
// can be imported at all. Never overwrites a value the caller already set - the
// integration run supplies its own DATABASE_URL, REDIS_URL and NODE_ENV.
process.env.DATABASE_URL ??= 'postgres://destow:destow@localhost:5432/destow_unit';
process.env.JWT_SECRET ??= 'unit_test_jwt_secret_at_least_32_characters';
process.env.OTP_HMAC_SECRET ??= 'unit_test_otp_hmac_secret_at_least_32_chars';
process.env.ALLOW_EPHEMERAL_JWT_KEYS ??= 'true';
process.env.ALLOW_LOG_OTP_CHANNEL ??= 'true';
// The app now refuses to construct a payment provider without either real
// Razorpay keys or this explicit opt-in, and config/env.ts parses at import -
// so without this, importing any module that transitively loads the payment
// adapter throws before a single unit test runs.
process.env.ALLOW_STUB_PAYMENTS ??= 'true';
process.env.CORS_ORIGINS ??= '';
