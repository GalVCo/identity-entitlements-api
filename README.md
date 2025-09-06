# identity-entitlements-api

Identity & Entitlements API — Google login (server-verified) and license/entitlement management for multiple apps and extensions.

## Overview

Backend for Chrome MV3 extensions and web apps that need:
- Server-side verification of Google `id_token` and issuance of an app JWT
- Simple entitlements (trial / lifetime / premium) with a small API surface

Tech: NestJS, Prisma, Postgres (dev/prod), jose, Swagger.

## Quickstart

1) Prereqs
- Node 18+, npm
- Postgres 16 (use Docker Compose below)

2) Setup
- Copy `.env.example` to `.env` and set values:
  - `ALLOWED_GOOGLE_CLIENT_IDS`: comma-separated OAuth client IDs
  - `JWT_SECRET`: a random secret for app JWT
  - `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/identity_entitlements`

3) Start DB (Docker)
- `npm run db:up`

4) Install & generate Prisma client
- `npm install`
- `npm run prisma:generate`

5) Apply migrations
- `npx prisma migrate dev --name init`

6) Run API (dev)
- `npm run dev`
- Swagger UI: `http://localhost:8787/docs`
- Swagger JSON: `http://localhost:8787/docs-json`
- Health: `GET http://localhost:8787/v1/health` → `{ ok: true }`

## Endpoints

Auth
- `POST /v1/auth/google` body `{ id_token: string }`
  - Verifies Google id_token via JWKS (jose)
  - Upserts user, returns app JWT (HS256, 60m)
  - Response: `{ token: string, user: { id, sub, email, name?, picture? } }`

Entitlements (require `Authorization: Bearer <token>`)
- `GET /v1/entitlement` → current entitlement
- `POST /v1/entitlement/issue` → idempotent; seeds 30‑day trial if missing
- `POST /v1/entitlement/refresh` → recompute flags (no‑op for now)

Entitlement response shape
```
{
  "tier": "trial|lifetime|premium",
  "lifetime": false,
  "premium_active": false,
  "trial_started_at": 0,
  "trial_expires_at": 0,
  "premium_expires_at": null
}
```

Tier rules
- lifetime=true → `lifetime`
- else if premiumActive and not expired → `premium`
- else if trialExpiresAt in future → `trial`
- otherwise `trial` (expired)

## Example flow
1) Exchange Google login for app token
- `POST /v1/auth/google` with a real Google `id_token` → `{ token, user }`
2) Seed entitlement (idempotent)
- `POST /v1/entitlement/issue` with Bearer token → seeds trial
3) Read entitlement
- `GET /v1/entitlement` with Bearer token → entitlement JSON

## Scripts
- `npm run dev` — start Nest in watch mode
- `npm run build` — compile TypeScript
- `npm run start:prod` — run compiled app
- `npm run prisma:generate` — generate Prisma client
- `npm run prisma:migrate` — interactive dev migration
- `npm run prisma:deploy` — apply migrations non‑interactively
- `npm run db:up` — start Postgres (Docker)
- `npm test`, `npm run test:watch`, `npm run test:cov`

## Development notes
- CORS is open in development. For production, restrict to your origins.
- Uses Bearer tokens (no cookies) for extension compatibility.
- Configure `ALLOWED_GOOGLE_CLIENT_IDS` to limit acceptable `aud` values.
- JWT claims include `scope=["entitlement:read","entitlement:write"]` for simple authZ.

### SQLite fallback (optional)
This project targets Postgres. For a quick local-only fallback, you can switch Prisma to SQLite:
1) Edit `prisma/schema.prisma` datasource `provider = "sqlite"`
2) Set `DATABASE_URL=file:./prisma/dev.db`
3) Run `npm run prisma:generate` and `npx prisma migrate dev`

Revert to Postgres by restoring `provider = "postgresql"` and `DATABASE_URL`.

## CI
GitHub Actions runs on Node 18: install, `prisma generate`, `migrate deploy`, `build`, `test`. A Postgres 16 service is provided.

## License
MIT
