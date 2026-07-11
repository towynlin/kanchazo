---
name: verify
description: Build, launch, and drive Kanchazo locally to verify a change end-to-end.
---

# Verifying Kanchazo changes at runtime

## Build & launch

```bash
npm ci                        # fresh container has no node_modules
cp .env.example .env
service postgresql start      # local cluster; Docker is usually unavailable in remote sessions
su postgres -c "psql -c \"CREATE USER kanchazo WITH PASSWORD 'kanchazo' CREATEDB;\" -c 'CREATE DATABASE kanchazo OWNER kanchazo;'"
DATABASE_URL=postgres://kanchazo:kanchazo@localhost:5432/kanchazo npx drizzle-kit migrate
npm run build
NODE_ENV=production node server.js &   # MUST be production: .env sets NODE_ENV=development,
                                       # and in dev mode the bundled server.js serves a broken
                                       # dev build (HMR socket fails, click handlers never hydrate)
curl -sf http://localhost:3000/healthz # {"ok":true,"db":true}
```

## Getting a signed-in session (no passkeys needed)

Auth is passkey-only, but recovery links bypass it:

```bash
npx tsx scripts/recovery-link.ts <email>   # run from repo root (dotenv); prints /recover/<token>
```

Tokens are **single-use** — mint a fresh one per browser context per run.
`POST /api/auth/recover-link {token}` sets the session cookie directly; from a
Playwright context, `ctx.request.post(...)` then shares the cookie with pages.

## Seeding

Insert users/teams/players via psql. **UUIDs must be RFC-4122 valid** (version
nibble 4, variant 8/9/a/b, e.g. `44444444-4444-4444-8444-444444444444`) — zod's
`.uuid()` rejects `4444...-4444-4444-...` shaped ids with "Invalid UUID".

## Driving

Playwright: import from `playwright-core` (repo dep), launch with
`executablePath: "/opt/pw-browsers/chromium"`, use `devices["iPhone 14"]`
(mobile-first app). Scripts outside the repo need a `node_modules` symlink next
to them or to live in the repo. Roster is at `/roster`; invite APIs at
`POST /api/invitations`.
