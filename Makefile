# Destow — dev orchestration for the Bun monorepo.
# Stack: Caddy gateway -> API (internal) + Postgres + Redis + MinIO.
#
# Cross-platform. Prerequisites everywhere: Bun, Docker Desktop, GNU make.
#   - macOS / Linux: works out of the box.
#   - Windows: install make (`choco install make` or `scoop install make`) and
#     run these from Git Bash or WSL (they provide the bash + coreutils these
#     recipes use). cmd.exe / PowerShell will NOT work.
# Run `make` (or `make help`) for the target list.

# Force bash so recipes behave identically on every OS (Git Bash on Windows).
SHELL := bash

API      := apps/api
MOBILE   := apps/mobile
CONTRACTS := packages/contracts
# docker-compose.yml (+ the git-ignored dev override) live in apps/api.
DC       := cd $(API) && docker compose
# Host connection to the dockerized dev DB (5434) for host-side migrations.
DEV_DB_URL := postgres://destow:destow_local@localhost:5434/destow
DEV_SECRET := make_local_dev_secret_at_least_32_characters

.DEFAULT_GOAL := help
.PHONY: help install env validate up local down logs restart ps \
        migrate seed db-generate backup restore mobile test test-integration \
        audit typecheck ci clean

help:
	@echo "Destow — make targets"
	@echo "  make install        Install workspace deps (frozen lockfile)"
	@echo "  make env            Create $(API)/.env from .env.example if missing"
	@echo "  make validate       Check tools, env vars, lockfile hygiene"
	@echo "  make up | local     Build + start the full local stack (gateway->api, db, redis, minio)"
	@echo "  make down           Stop the stack"
	@echo "  make logs           Tail api + gateway logs"
	@echo "  make restart        Recreate the api + gateway containers"
	@echo "  make ps             Show stack status"
	@echo "  make migrate        Run DB migrations (against the dockerized dev DB)"
	@echo "  make seed           Seed the DB"
	@echo "  make db-generate    Generate a new migration from the Drizzle schema"
	@echo "  make backup         Back up the database to backups/ (timestamped dump)"
	@echo "  make restore FILE=.. Restore the database from a dump file"
	@echo "  make mobile         Start the Expo dev server"
	@echo "  make test           Backend unit + contracts tests (fast, no infra)"
	@echo "  make test-integration  Integration tests (spins up db-test + redis)"
	@echo "  make audit          Dependency vulnerability audit (whole workspace)"
	@echo "  make typecheck      Typecheck all workspaces (turbo lint)"
	@echo "  make ci             Run the full CI locally (audit + typecheck + all tests + mobile)"
	@echo "  make clean          Stop stack + remove volumes"

# --- Setup ------------------------------------------------------------------
install:
	bun install --frozen-lockfile

env:
	@if [ -f $(API)/.env ]; then echo "$(API)/.env already exists"; \
	else cp $(API)/.env.example $(API)/.env && echo "created $(API)/.env from .env.example — fill in the values"; fi

validate:
	@echo "Validating dev environment..."
	@command -v bun >/dev/null && echo "  ok   bun $$(bun --version)" || { echo "  ERR  bun not installed  (https://bun.sh)"; exit 1; }
	@docker compose version >/dev/null 2>&1 && echo "  ok   docker compose" || { echo "  ERR  docker / docker compose not available"; exit 1; }
	@test -f bun.lock && echo "  ok   bun.lock present" || { echo "  ERR  bun.lock missing — run 'bun install'"; exit 1; }
	@test ! -f package-lock.json && echo "  ok   no stray npm lockfile" || { echo "  ERR  package-lock.json present (this is a bun workspace)"; exit 1; }
	@test -f $(API)/.env && echo "  ok   $(API)/.env present" || { echo "  ERR  $(API)/.env missing — run 'make env'"; exit 1; }
	@grep -q '^DATABASE_URL=' $(API)/.env && echo "  ok   DATABASE_URL set" || { echo "  ERR  DATABASE_URL missing in $(API)/.env"; exit 1; }
	@sec=$$(grep '^JWT_SECRET=' $(API)/.env | head -1 | cut -d= -f2-); if [ $${#sec} -ge 32 ]; then echo "  ok   JWT_SECRET (>=32 chars)"; else echo "  ERR  JWT_SECRET missing or <32 chars in $(API)/.env"; exit 1; fi
	@echo "Environment OK."

# --- Stack ------------------------------------------------------------------
up local:
	$(DC) up -d --build
	@echo ""
	@echo "Stack up. API via gateway: http://localhost:3000  (health: /health)"

down:
	$(DC) down

logs:
	$(DC) logs -f api gateway

restart:
	$(DC) up -d --build api gateway

ps:
	$(DC) ps

clean:
	$(DC) down -v

# --- Database ---------------------------------------------------------------
# Run against the dockerized dev DB from the host; bring the DB up first.
migrate:
	$(DC) up -d --wait db
	cd $(API) && DATABASE_URL="$(DEV_DB_URL)" JWT_SECRET="$(DEV_SECRET)" bun run db:migrate

seed:
	$(DC) up -d --wait db
	cd $(API) && DATABASE_URL="$(DEV_DB_URL)" JWT_SECRET="$(DEV_SECRET)" bun run db:seed

db-generate:
	cd $(API) && DATABASE_URL="$(DEV_DB_URL)" bun run db:generate

backup:
	./scripts/db-backup.sh backups

restore:
	@test -n "$(FILE)" || { echo "usage: make restore FILE=backups/destow-<timestamp>.dump"; exit 1; }
	cd $(API) && docker compose exec -T db pg_restore -U destow -d destow --clean --if-exists < ../../$(FILE)
	@echo "restored from $(FILE)"

# --- Mobile -----------------------------------------------------------------
mobile:
	cd $(MOBILE) && bun expo start

# --- Tests / CI -------------------------------------------------------------
test:
	cd $(API) && bun test
	cd $(CONTRACTS) && bun test

test-integration:
	$(DC) --profile test up -d --wait db-test redis
	cd $(API) && bun run test:integration

audit:
	bun audit

typecheck:
	bun run lint

# Mirrors the GitHub workflows (ci.yml + audit.yml + mobile.yml) locally.
ci: install
	bun audit --audit-level=high
	bun run lint
	cd $(MOBILE) && bunx tsc --noEmit
	cd $(MOBILE) && bun expo install --check
	cd $(API) && bun test
	cd $(CONTRACTS) && bun test
	$(DC) --profile test up -d --wait db-test redis
	cd $(API) && bun run test:integration
	@echo ""
	@echo "CI passed locally."
