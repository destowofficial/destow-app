# Local test container for the Destow API.
# Production runs the same Bun code on a VPS/ECS. Build context is the repo root.
# Pinned to the same Bun as package.json "packageManager". The floating `1` tag
# moves, and a newer Bun rejects a lockfile an older one wrote - which is exactly
# what --frozen-lockfile below is meant to guarantee against. Bump both together.
FROM oven/bun:1.3.9

WORKDIR /app

# Install only the api workspace (+ its contracts dep). EVERY workspace manifest
# must be copied or --frozen-lockfile fails: bun resolves the `apps/*` and
# `packages/*` globs, finds a member missing, and calls the lockfile stale. Add a
# line here whenever a workspace is added. --filter means only the api's deps are
# actually installed, keeping the image lean.
# --frozen-lockfile: build exactly what bun.lock pins (reproducible; can't
# silently resolve a different/compromised version than what was audited).
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile --filter=@destow/api

# Source (contracts ships TS source — Bun imports it directly, no build step).
COPY packages/contracts packages/contracts
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Drop root. A compromise in the API should not own the container filesystem,
# and nothing here needs to write outside the app directory. The oven/bun image
# ships a non-root `bun` user; the source is owned by root and only read.
USER bun

# Migrate + seed, then start the server.
CMD ["sh", "-c", "bun run db:migrate && bun run db:seed && bun src/index.ts"]
