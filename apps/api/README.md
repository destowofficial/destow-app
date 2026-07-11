# Destow API

Backend for Destow — an intercity cab & bus booking marketplace. **Bun + Express +
PostgreSQL (Drizzle) + Redis**, served behind a Caddy gateway. Bun runs the
TypeScript directly, so there is no build step.

Part of the [Destow monorepo](../../README.md) — most tasks run from the repo
root via the `Makefile`.

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Bun (TypeScript, no bundler) |
| HTTP | Express 5 |
| Database | PostgreSQL via Drizzle ORM (money in integer paise, distance in integer metres) |
| Cache / real-time | Redis (auth revocation denylist, rate limits) |
| Gateway | Caddy (single public entry point; the API is internal-only) |
| Auth | phone + OTP -> EdDSA (Ed25519) access tokens + rotating refresh tokens, Redis-backed revocation |
| OTP delivery | swappable adapter (AWS SNS today; WhatsApp planned) |

## Local development

From the repo root (recommended):

```bash
make up          # gateway + api + postgres + redis + minio (hot-reload)
make migrate     # run migrations
make logs        # tail api + gateway logs
```

The API is reachable through the gateway at `http://localhost:3000` (`/health`
to check). Or run docker compose directly:

```bash
cd apps/api && docker compose up -d --build
```

Environment: `make env` copies `.env.example` to `.env` (fill it in). The docker
stack also gets its env from `docker-compose.yml`. Key vars: `DATABASE_URL`,
`REDIS_URL`, `JWT_SECRET` (OTP HMAC), and — for the production token path —
`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (Ed25519 PEM/base64; unset in dev = an
ephemeral keypair).

## Structure

```text
src/
├── index.ts            # Express app + HTTP server (Socket.io attaches here later)
├── v1/                 # versioned route files (auth.route.ts, ...)
├── controllers/<f>/    # per-feature controllers
├── services/<f>/       # per-feature services
├── middleware/         # auth (JWT verify + denylist), rate limiting
├── lib/
│   ├── auth/           # Ed25519 keys + JWKS, JWT sign/verify (jose)
│   ├── adapters/       # sms, payments, maps (swappable providers)
│   ├── pricing/        # fare + commission engine (integer paise)
│   └── http/           # errors, response envelope, validation
├── db/                 # Drizzle schema, migrations, connection, redis
└── config/             # zod-validated env
```

## API (v1)

Base path `/api/v1`. Envelope: `{ success, data }` on success, `{ success,
error, code }` on failure.

Auth:
- `POST /auth/request-otp` — send an OTP (rate limited)
- `POST /auth/verify-otp` — verify + create a session -> `{ accessToken, refreshToken, user }`
- `POST /auth/refresh` — rotate the token pair (with reuse detection)
- `POST /auth/logout` / `POST /auth/logout-all` — revoke this session / all sessions
- `GET  /auth/sessions` — list active devices

System:
- `GET /health`
- `GET /.well-known/jwks.json` — public keys for verifying access tokens

## Testing

```bash
make test              # unit (backend + contracts)
make test-integration  # auth/session integration (Postgres + Redis)
```

Or from `apps/api`: `bun test` (unit) and `bun run test:integration`.

## Database

```bash
make migrate       # apply migrations
make db-generate   # generate a migration from the Drizzle schema
make seed          # seed baseline data
```

## Deployment

On push to `main`, `.github/workflows/deploy.yml` builds this image
(`Dockerfile`) and publishes it to GHCR; it runs on a VPS/ECS. Bun runs the
TypeScript directly — no build step.
