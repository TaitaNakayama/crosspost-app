# Crosspost

npm workspaces monorepo.

- `apps/api` — Node/TS backend (Fastify + Prisma + Postgres). Owns every platform token.
- `apps/mobile` — Expo app (Expo Router) targeting iOS, Android, and web from one codebase.

See `CLAUDE.md` for build order and architectural constraints, and
`docs/api-gates-and-constraints.md` for platform gates, timelines, and costs.

## Setup

```sh
npm install
```

### Backend

Needs a Postgres instance — local install, Docker, or hosted (Neon, Supabase, RDS).
None is set up yet; point `DATABASE_URL` at one.

```sh
cp apps/api/.env.example apps/api/.env   # then edit DATABASE_URL
npm run db:migrate -w @crosspost/api     # creates the tables
npm run api                              # http://localhost:3000
```

### App

```sh
cp apps/mobile/.env.example apps/mobile/.env
npm run mobile          # then press i / a / w
```

Simulators and physical devices can't reach `localhost` — set `EXPO_PUBLIC_API_URL`
to your machine's LAN address when running on a device.

## Status

Scaffolding only. Auth is a stubbed `x-user-id` header and must be replaced
before anything is deployed. No platform OAuth or publish worker yet.
