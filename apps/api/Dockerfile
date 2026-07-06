# Local test container for the Destow API.
# Production runs the same Bun code on a VPS/ECS. Build context is the repo root.
FROM oven/bun:1

WORKDIR /app

# Install the api + contracts workspaces (mobile is not copied — see .dockerignore).
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
RUN bun install

# Source (contracts ships TS source — Bun imports it directly, no build step).
COPY packages/contracts packages/contracts
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000

# Migrate + seed, then start the server.
CMD ["sh", "-c", "bun run db:migrate && bun run db:seed && bun src/index.ts"]
