# Destow Project Targets & Roadmap

What has been built so far, and what comes next.

---

## Done

**Backend rebuild (Bun toolchain)**
- [x] Rebuilt the backend on **Bun + Express + TypeScript** (Bun runs TS directly, no build step).
- [x] **PostgreSQL + Drizzle ORM** with generated migrations; money in integer paise, distance in integer metres.
- [x] **Redis** for the auth revocation denylist and rate-limit counters.
- [x] **Caddy gateway** as the single public entry point; the API is internal-only.

**Authentication**
- [x] Phone + OTP login; OTP codes stored HMAC-hashed with attempt lockout and Redis rate limiting (per-phone cooldown/caps + per-IP backstop).
- [x] **EdDSA (Ed25519) access tokens** + JWKS endpoint; **rotating refresh tokens** with reuse detection; Redis-backed revocation that is **fail-closed**.
- [x] Integration tests covering the reuse race, rotation, revoked/expired sessions, ban-at-refresh, and fail-closed behaviour.

**Marketplace foundation**
- [x] Server-side **fare + commission engine** (integer paise, commission clamped 15-20%) — the client can never set the price.
- [x] Schema for providers, vehicle types, vehicles, drivers, bookings (with a frozen fare snapshot), ratings, and platform settings.
- [x] Swappable **provider adapters** (SMS / payments / maps), selected by env.

**Platform & tooling**
- [x] Docker Compose local stack (gateway, api, Postgres, Redis, MinIO) + a cross-platform `Makefile`.
- [x] CI: backend typecheck + tests (`ci.yml`), whole-workspace vulnerability audit (`audit.yml`), Expo checks (`mobile.yml`); Dependabot on the `bun` ecosystem.
- [x] Deploy: container image built and published to GHCR on push to `main` (`deploy.yml`).
- [x] Mobile: aligned Expo SDK 57 native-module versions (fixed a startup crash) and cleared all dependency vulnerabilities.

---

## Next

### Marketplace core (build one module at a time)
- [ ] Provider onboarding — a user becomes a provider and manages vehicles and drivers (RBAC).
- [ ] **Provider routes & availability** — providers declare which routes they serve and when each vehicle is free. **Instant dispatch cannot ship without this**, so it lands before bookings.
- [ ] Availability & quote — search a route; return available vehicles with server-computed per-km fares (distance from the maps adapter). **One-way and up-down carry separate per-km rates**; up-down is the cheaper rate and bills both legs.
- [ ] Bookings — create a booking with a server-frozen fare snapshot, then **assign a pre-committed vehicle and driver immediately at confirm time**. There is no provider-accept step and no waiting state. Customer history; provider schedule.
- [ ] Ratings — one per completed booking; feeds the provider rating.

### Integrations
- [ ] **WhatsApp OTP** via the Meta Cloud API (behind the OTP delivery adapter); keep AWS SNS as the SMS fallback.
- [ ] **Payments** — Razorpay adapter (order create + webhook verification).
- [ ] **Maps** — Google Distance Matrix adapter for server-side distance.
- [ ] **KYC** — document upload to MinIO/S3 + provider verification flow, covering RC, driving licence, PAN, bank, and — per the Motor Vehicles Act — **state permit and vehicle insurance**, with trips blocked while either is expired.

### Clients — two apps, one web
- [ ] **Destow** (customer app, `apps/mobile`) — search, book, ₹/km fare, driver details on confirm, trips, payments, support, referrals.
- [ ] **Destow Partner** (provider app) — a separate install with its own entry and account: onboarding + KYC, vehicles, routes/availability, drivers, assigned trips, fare collection, settlements, earnings. Serves both the solo owner-driver and the fleet agency.
- [ ] **`apps/web`** (Next.js) — marketing landing page first (D2C + B2B lead capture, ₹/km calculator, SEO). The admin dashboard for internal ops, bookings and reporting is a later, separate surface in the same app.

### Real-time
- [ ] Socket.io live driver/trip tracking, attached to the API's HTTP server and backed by Redis pub/sub (the reason the API runs long-lived, not on Lambda).

### Production
- [ ] Generate and set the Ed25519 signing keypair (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`) — required in production.
- [ ] Provision the target host (VPS or ECS), wire the rollout step in `deploy.yml`, and set real secrets (DB, Redis, SNS/WhatsApp, Razorpay, Maps).
