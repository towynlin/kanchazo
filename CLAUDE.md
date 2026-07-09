# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Kanchazo is a mobile-first, invite-only PWA for managing youth sports teams: schedule with availability, group chat with live updates, roster, iCal feed, Web Push. Next.js 16 (App Router) + React 19, PostgreSQL via Drizzle ORM, Tailwind 4. The product spec lives in `product-spec.md`.

## Commands

```bash
make dev                  # Start Postgres (Docker) + migrations + Next dev server on :3000
make seed-admin PHONE=+14155550100   # Bootstrap first coach invite (app is invite-only)

npm run lint              # eslint + tsc --noEmit + prettier --check (exactly what CI runs)
npm run lint:fix          # auto-fix eslint + prettier

npm run test:unit         # Vitest unit tests, no DB needed
make test-integration     # Starts Postgres, runs Vitest integration tests
npm run test:e2e          # Playwright; needs `npm run build` + migrated DB first

npm run db:generate       # Generate a migration after editing lib/db/schema.ts
make migrate              # Apply pending migrations (needs DATABASE_URL, see AGENTS.md)

npm run build             # next build + esbuild bundles server.ts → server.js
```

Run a single test file or case:

```bash
npx vitest run --project unit tests/unit/phone.test.ts
npx vitest run --project integration tests/integration/teams.test.ts   # needs DATABASE_URL
npx vitest run --project unit -t "rejects invalid numbers"
```

Integration tests default to `postgres://kanchazo:kanchazo@localhost:5432/kanchazo_test` (a separate `kanchazo_test` database, not the dev one). The global setup runs migrations; `tests/integration/setup.ts` truncates all tables after each test, and files run serially (`fileParallelism: false`).

CI (`.github/workflows/ci.yml`) runs four jobs: lint/typecheck, unit + integration tests, build, and Playwright e2e (mobile Chrome + mobile Safari viewports against the production build).

## Architecture

### Custom server, not serverless

`server.ts` is the production entrypoint: a plain Node HTTP server that wraps Next's request handler and attaches the WebSocket server (`lib/realtime/server.ts`). `npm run build` bundles it to `server.js` with esbuild. This requires a persistent Node process — the app cannot run on Vercel/serverless. In dev (`next dev`), the WebSocket server is not running; chat still works because messages flow through the POST API and polling isn't needed for correctness, only liveness.

### Layering

```
app/api/**/route.ts        HTTP layer: zod-parse input, call auth guards, call queries
  → lib/api/               requireAuth / requireTeamMember / requireCoach guards,
                           ok()/err()/handleZodError() response helpers
  → lib/db/queries/        ALL SQL lives here (one file per table/concern)
  → lib/domain/            Pure business logic, no I/O — this is what unit tests cover
```

- `lib/db/schema.ts` is the single Drizzle schema file; migrations are checked in under `db/migrations/` and applied automatically on container boot (`npm run migrate && node server.js` in the Dockerfile CMD).
- API handlers follow a consistent pattern: `const auth = await requireCoach(teamId); if (!auth.ok) return auth.response;` — read an existing route in `app/api/teams/` before writing a new one.
- Permission rules are centralized as predicate functions in `lib/domain/roles.ts` (roles are `parent` | `coach`, per-team, stored on `team_memberships`).

### Auth

No passwords. SMS magic links (`lib/auth/magic-link.ts` + `magic_tokens` table) create a session: an opaque token in the `kanchazo_session` cookie, stored server-side as a sha256 hash in `sessions` with a 30-day rolling expiry (`lib/auth/session.ts`). Passkeys (SimpleWebAuthn, `lib/auth/passkeys.ts`) are offered after first login. Signup is invite-only via the `invitations` table; `scripts/seed-admin.ts` creates the first invite. Server pages gate auth in `app/(app)/layout.tsx` (redirects to `/auth`); API routes use the `lib/api/require-auth.ts` guards. The active team is the `kanchazo_team` cookie (`lib/api/selected-team.ts`).

### Real-time chat

Clients open a WebSocket to `/api/ws?team=<teamId>`, authenticated by the same session cookie during the HTTP upgrade. The socket is receive-only — messages are sent via `POST /api/teams/[teamId]/messages`, which persists to Postgres and `NOTIFY`s the `chat:<teamId>` channel. Each app instance holds one pg `LISTEN` client and fans notifications out to its local sockets, so chat works across multiple instances with no extra infrastructure.

### Pluggable providers

SMS (`lib/sms/`) and email (`lib/email/`) are interfaces selected by `SMS_PROVIDER` / `EMAIL_PROVIDER` env vars: `twilio`/`resend` in production, `logger` (prints to console) in dev and tests. This means local dev needs no external credentials — magic links appear in the server console. Copy `.env.example` to `.env`; the defaults work as-is (`make dev` even does the copy for you).

### Frontend

Pages under `app/(app)/` are server components that fetch data and pass it to a co-located `*Client.tsx` client component (e.g. `schedule/page.tsx` → `ScheduleClient.tsx`). Shared UI lives in `components/`; `AppShell.tsx` provides the tab navigation. The app is mobile-first — Playwright runs exclusively mobile viewports.
