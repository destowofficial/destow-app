# Local test container for the Destow API.
# Production runs the same Bun code on a VPS/ECS. Build context is the repo root.
FROM oven/bun:1

WORKDIR /app

# Install only the api workspace (+ its contracts dep). All workspace manifests
# are copied so --frozen-lockfile can validate the full lockfile, but --filter
# means mobile's deps are never installed, keeping the image lean.
# --frozen-lockfile: build exactly what bun.lock pins (reproducible; can't
# silently resolve a different/compromised version than what was audited).
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN bun install --frozen-lockfile --filter=@destow/api

# Source (contracts ships TS source — Bun imports it directly, no build step).
COPY packages/contracts packages/contracts
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Migrate + seed, then start the server.
CMD ["sh", "-c", "bun run db:migrate && bun run db:seed && bun src/index.ts"]
