# Destow

Destow is an intercity (outstation) **cab & bus booking marketplace** for India —
transparent per-kilometre pricing, with a commission charged to service
providers. This is the monorepo for the whole platform: backend API, mobile app,
and shared contracts.

---

## Monorepo

Bun workspaces + Turborepo. `bun.lock` is the single lockfile (no npm/yarn).

| Path | What it is |
| --- | --- |
| `apps/api` | Backend — Bun + Express + PostgreSQL (Drizzle) + Redis, behind a Caddy gateway |
| `apps/mobile` | Mobile app — Expo / React Native |
| `packages/contracts` | Shared TypeScript contracts (enums, response envelope, zod schemas) |

## Tech stack

- **Backend:** Bun, Express 5, TypeScript, PostgreSQL + Drizzle ORM, Redis, Caddy (gateway)
- **Auth:** phone + OTP, EdDSA (Ed25519) access tokens + rotating refresh tokens, Redis-backed revocation. OTP delivery is a swappable adapter (AWS SNS today; WhatsApp planned)
- **Mobile:** Expo, React Native, TypeScript
- **Tooling:** Turborepo, Docker Compose, GitHub Actions, `bun test`, a top-level `Makefile`

## Architecture

A single Caddy gateway is the only public entry point; the API is internal-only.
The API runs on Bun on a VPS/ECS (not Lambda) so it can hold WebSocket
connections for the planned real-time layer.

```
Mobile / clients
      |  HTTPS
      v
Caddy gateway  (host :3000, prod :443)     single entry, TLS, WebSocket-transparent
      |  reverse_proxy (internal network)
      v
API (Bun + Express)  --->  PostgreSQL   (users, sessions, bookings, ...)
      |                \->  Redis        (revocation denylist, rate limits)
      \->  AWS SNS (OTP SMS)   .   MinIO / S3 (KYC docs, vehicle photos)
```

Server-side fare + commission engine computes money in integer paise (no floats);
the client never sets the fare.

---

## Quick start

Prerequisites: **Bun 1.3+**, **Docker Desktop**, and **GNU make**.

- **macOS / Linux** — works out of the box.
- **Windows** — install make (`choco install make` or `scoop install make`) and run
  the `make` commands from **Git Bash** or **WSL** (they provide the bash +
  coreutils the Makefile uses); cmd.exe / PowerShell will not work.

```bash
make validate      # check tooling, env vars, lockfile hygiene
make env           # create apps/api/.env from the example (then fill it in)
make up            # build + start the stack (gateway, api, db, redis, minio)
make migrate       # run database migrations
make mobile        # start the Expo dev server (separate terminal)
```

The API is then reachable through the gateway at `http://localhost:3000`
(`/health` for a check). Run `make` with no target to list everything.

### Make targets

| Command | Does |
| --- | --- |
| `make up` / `make local` | Start the full local stack (hot-reload via the dev override) |
| `make down` / `make clean` | Stop / stop and wipe volumes |
| `make logs` / `make ps` | Tail api+gateway logs / show stack status |
| `make migrate` / `make seed` | Run migrations / seed the database |
| `make db-generate` | Generate a migration from the Drizzle schema |
| `make mobile` | Start the Expo dev server |
| `make test` / `make test-integration` | Unit / integration tests |
| `make audit` / `make typecheck` | Dependency audit / typecheck all workspaces |
| `make ci` | Run the full CI locally (audit + typecheck + all tests + mobile) |

---

## Project structure

```
Destow/
|-- apps/
|   |-- api/                     # Bun + Express backend
|   |   |-- src/
|   |   |   |-- v1/              # versioned route files
|   |   |   |-- controllers/     # per-feature controllers
|   |   |   |-- services/        # per-feature services
|   |   |   |-- middleware/       # auth, rate limiting
|   |   |   |-- lib/             # adapters (sms/payments/maps), pricing, http, auth
|   |   |   |-- db/              # Drizzle schema, migrations, connection, redis
|   |   |   +-- config/          # validated env
|   |   |-- docker-compose.yml   # gateway + api + db + redis + minio
|   |   +-- Dockerfile
|   +-- mobile/                  # Expo / React Native app
|-- packages/
|   +-- contracts/               # shared enums, envelope, zod schemas
|-- Makefile                     # dev orchestration
+-- turbo.json
```

---

## Testing & CI

- `make test` — backend + contracts unit tests
- `make test-integration` — auth/session integration tests against real Postgres + Redis
- `make ci` — mirrors the GitHub Actions pipeline locally

GitHub Actions:

- `ci.yml` — backend typecheck + unit + integration tests
- `audit.yml` — `bun audit` gate across the whole workspace (fails on high/critical)
- `mobile.yml` — Expo typecheck + dependency-version check
- Dependabot (`bun` ecosystem) keeps dependencies current

---

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` builds the API container
image (`apps/api/Dockerfile`) and publishes it to GHCR; the image runs on a
VPS/ECS. The rollout step is wired to the target host once its secrets exist.

> The earlier AWS Lambda / CloudFormation path has been retired — Lambda cannot
> hold the persistent WebSocket connections the real-time layer needs.

---

## Development workflow

Branch off `main`, open a Pull Request, and let CI gate the merge (typecheck,
tests, and the dependency audit must pass).

```bash
git checkout -b feat/your-change
# ... work, then:
make ci        # verify locally before pushing
git push -u origin feat/your-change
```
