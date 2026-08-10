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
.PHONY: help install env validate up local down logs restart ps endpoints obs-up obs-down obs-logs obs-ps \
        migrate seed db-generate backup restore mobile city-photos test test-integration \
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
	@echo "  make endpoints      Print the API URLs for this machine and for the phone"
	@echo "  make obs-up         Start local observability (Prometheus, Grafana, Alertmanager, Blackbox)"
	@echo "  make obs-down       Stop local observability"
	@echo "  make obs-logs       Tail observability logs"
	@echo "  make obs-ps         Show observability stack status"
	@echo "  make migrate        Run DB migrations (against the dockerized dev DB)"
	@echo "  make seed           Seed the DB"
	@echo "  make db-generate    Generate a new migration from the Drizzle schema"
	@echo "  make backup         Back up the database to backups/ (timestamped dump)"
	@echo "  make restore FILE=.. Restore the database from a dump file"
	@echo "  make mobile         Start the Expo dev server"
	@echo "  make city-photos    Fetch destination photos (optional; not in git)"
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
	@sec=$$(grep '^OTP_HMAC_SECRET=' $(API)/.env | head -1 | cut -d= -f2-); if [ $${#sec} -ge 32 ]; then echo "  ok   OTP_HMAC_SECRET (>=32 chars)"; else echo "  ERR  OTP_HMAC_SECRET missing or <32 chars in $(API)/.env"; exit 1; fi
	@echo "Environment OK."

# --- Stack ------------------------------------------------------------------
up local:
	$(DC) up -d --build
	@$(MAKE) --no-print-directory endpoints

# Both addresses, because they are not interchangeable: this machine reaches the
# API on localhost, but a phone or an emulator is a different host and needs the
# LAN one. Printed after every `up` since the Wi-Fi address follows the DHCP
# lease and changes without warning - a stale IP in the mobile .env looks
# exactly like a broken API.
endpoints:
	@ip=$$( \
	  ipconfig getifaddr en0 2>/dev/null \
	  || ipconfig getifaddr en1 2>/dev/null \
	  || { hostname -I 2>/dev/null | awk '{print $$1}'; } \
	  || true ); \
	echo ""; \
	echo "Stack up."; \
	echo ""; \
	echo "  API   (this machine)  http://localhost:3000/api/v1"; \
	if [ -n "$$ip" ]; then \
	  echo "  API   (Wi-Fi / phone) http://$$ip:3000/api/v1"; \
	else \
	  echo "  API   (Wi-Fi / phone) — could not detect a LAN address; are you online?"; \
	fi; \
	echo "  Health                http://localhost:3000/health"; \
	echo ""; \
	if [ -n "$$ip" ] && [ -f $(MOBILE)/.env ]; then \
	  want="http://$$ip:3000/api/v1"; \
	  have=$$(grep -m1 '^EXPO_PUBLIC_API_URL=' $(MOBILE)/.env | cut -d= -f2-); \
	  if [ "$$have" != "$$want" ]; then \
	    echo "  ! $(MOBILE)/.env points at: $${have:-<unset>}"; \
	    echo "    the phone needs:          $$want"; \
	    echo "    fix it, then restart Metro (EXPO_PUBLIC_* is baked in at bundle time):"; \
	    echo "      cd $(MOBILE) && bunx expo start --clear"; \
	    echo ""; \
	  fi; \
	fi

down:
	$(DC) down

logs:
	$(DC) logs -f api gateway

restart:
	$(DC) up -d --build api gateway

ps:
	$(DC) ps

obs-up:
	cd $(API) && docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
	@echo ""
	@echo "Observability up:"
	@echo "  Grafana:    http://localhost:3001  (admin / destow_admin_change_me)"
	@echo "  Prometheus: http://localhost:9090"

obs-down:
	cd $(API) && docker compose -f docker-compose.yml -f docker-compose.observability.yml stop prometheus alertmanager grafana blackbox-exporter
	cd $(API) && docker compose -f docker-compose.yml -f docker-compose.observability.yml rm -f prometheus alertmanager grafana blackbox-exporter

obs-logs:
	cd $(API) && docker compose -f docker-compose.yml -f docker-compose.observability.yml logs -f prometheus grafana alertmanager blackbox-exporter

obs-ps:
	cd $(API) && docker compose -f docker-compose.yml -f docker-compose.observability.yml ps

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
# Optional: the photos are not in git, and the app falls back to pin tiles
# without them.
city-photos:
	./scripts/city-photos.sh

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
