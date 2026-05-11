# Kanchazo

Kanchazo is a Spanish-rooted word — _cancha_ is what Latino families call the field, where their kids play every weekend. Add _-azo_ and it becomes a big, joyful play — like _golazo_. That's what this app is about: making the weekend game day feel like a win for parents too.

A mobile-first, invite-only PWA for managing youth sports teams. Coaches create the team, invite parents, and everyone sees the same schedule, sets availability, and chats in one place. No accounts to create, no payments, no noise.

**Features:** SMS magic-link auth · Passkeys · Schedule with inline availability · Group chat with live updates · Roster management · iCal feed · Web Push notifications · Invite-only signup

---

## Running locally

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### Setup

```bash
git clone git@github.com:towynlin/kanchazo.git
cd kanchazo
npm install
```

Copy the example env file and edit as needed:

```bash
cp .env.example .env
```

The defaults work out of the box for local development — SMS and email are logged to the console instead of sent, so you never need Twilio or Resend credentials to develop.

### Start

```bash
make dev
```

That command starts Postgres in Docker, runs all migrations, and starts the Next.js dev server at [http://localhost:3000](http://localhost:3000).

### Seed the first coach

The app is invite-only, so you need to create an invitation to get your first user in:

```bash
make seed-admin PHONE=+15555550100
```

The invite link is printed to the console. Open it to complete signup, create your first team, and start inviting parents.

### Other make targets

| Command          | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `make dev`       | Start Postgres + dev server                     |
| `make migrate`   | Run pending DB migrations                       |
| `make test`      | Unit + integration tests                        |
| `make test-unit` | Unit tests only (no DB needed)                  |
| `make lint`      | ESLint + TypeScript + Prettier                  |
| `make build`     | Production build                                |
| `make clean`     | Remove containers, volumes, and build artifacts |

### Running with Docker Compose

To run the full stack (app + Postgres) in Docker:

```bash
docker compose up
```

The app will be available at [http://localhost:3000](http://localhost:3000). The database is persisted in a named Docker volume.

---

## Deploying

### Environment variables

Set these in your hosting environment. Never commit `.env`.

| Variable              | Required  | Description                                                      |
| --------------------- | --------- | ---------------------------------------------------------------- |
| `DATABASE_URL`        | ✅        | Postgres connection string                                       |
| `NEXT_PUBLIC_APP_URL` | ✅        | Public URL of the app, e.g. `https://kanchazo.fly.dev`           |
| `SESSION_SECRET`      | ✅        | Random 64-char hex string for signing session cookies            |
| `WEBAUTHN_RP_ID`      | ✅        | Domain only, e.g. `kanchazo.fly.dev`                             |
| `WEBAUTHN_ORIGIN`     | ✅        | Full origin, e.g. `https://kanchazo.fly.dev`                     |
| `WEBAUTHN_RP_NAME`    | ✅        | Display name shown in passkey prompts                            |
| `SMS_PROVIDER`        | ✅        | `twilio` in production, `logger` in dev                          |
| `TWILIO_ACCOUNT_SID`  | if Twilio | From the Twilio console                                          |
| `TWILIO_AUTH_TOKEN`   | if Twilio | From the Twilio console                                          |
| `TWILIO_FROM_NUMBER`  | if Twilio | E.164 number, e.g. `+15005550006`                                |
| `EMAIL_PROVIDER`      | ✅        | `resend` in production, `logger` in dev                          |
| `RESEND_API_KEY`      | if Resend | From the Resend dashboard                                        |
| `VAPID_PUBLIC_KEY`    | optional  | Web Push public key (for push notifications)                     |
| `VAPID_PRIVATE_KEY`   | optional  | Web Push private key                                             |
| `VAPID_SUBJECT`       | optional  | `mailto:` URI for VAPID, defaults to `mailto:admin@kanchazo.app` |

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

Generate a session secret with:

```bash
openssl rand -hex 32
```

### Fly.io

[Fly.io](https://fly.io) is the recommended host. It supports Docker deployments, has managed Postgres, and handles WebSocket connections natively.

**1. Install the Fly CLI and log in:**

```bash
brew install flyctl   # or see https://fly.io/docs/getting-started/installing-flyctl/
fly auth login
```

**2. Create the app:**

```bash
fly launch --no-deploy
```

Answer the prompts. When asked about a Postgres database, create one (or attach an existing one).

**3. Set secrets:**

```bash
fly secrets set \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  WEBAUTHN_RP_ID="your-app-name.fly.dev" \
  WEBAUTHN_ORIGIN="https://your-app-name.fly.dev" \
  NEXT_PUBLIC_APP_URL="https://your-app-name.fly.dev" \
  SMS_PROVIDER=twilio \
  TWILIO_ACCOUNT_SID=ACxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxx \
  TWILIO_FROM_NUMBER=+15005550006 \
  EMAIL_PROVIDER=resend \
  RESEND_API_KEY=re_xxxxxxx
```

**4. Deploy:**

```bash
fly deploy
```

Migrations run automatically on each deploy before the server starts.

**5. Seed the first coach:**

```bash
fly ssh console -C "npm run migrate && tsx scripts/seed-admin.ts +15555550100"
```

The invite link is printed to the console. Or set `NEXT_PUBLIC_APP_URL` before running so the link points to your live domain.

### Other providers

The app ships a standard `Dockerfile` and will run anywhere Docker containers are accepted — Railway, Render, Google Cloud Run, AWS App Runner, etc.

The only requirement beyond a container runtime is a **Postgres 15+** database and the environment variables above. The WebSocket server is embedded in the app process (no separate service needed).

For **Vercel or other serverless platforms**: the embedded WebSocket server (`server.ts`) requires a persistent Node.js process and is not compatible with serverless/edge runtimes. Use a traditional container host instead.

---

## Architecture notes

- **Auth:** SMS magic links (no password). Passkeys offered after first login.
- **Real-time chat:** WebSocket server embedded in the Next.js process, backed by Postgres `LISTEN/NOTIFY` for fan-out across multiple instances.
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team). Migrations live in `db/migrations/` and are applied automatically on boot.
- **Push notifications:** Web Push API with VAPID. iOS requires the app to be added to the Home Screen (PWA mode) for push to work.
- **Invite-only:** No self-service registration. A system admin issues the first coach invitation via the CLI; coaches invite everyone else from within the app.

---

## Development

### Tests

```bash
make test-unit          # pure domain logic, no DB
make test-integration   # requires Postgres (started automatically via Docker)
npm run test:e2e        # Playwright, requires a running server
```

### Migrations

```bash
# Generate a migration after editing lib/db/schema.ts
npm run db:generate

# Apply pending migrations
make migrate
```

### Project structure

```
app/             Next.js App Router pages and API routes
components/      Shared UI components
lib/
  auth/          Sessions, magic links, passkeys
  db/            Drizzle schema and query functions
  domain/        Pure business logic (roles, availability, invites)
  sms/           SMS provider interface + Twilio + logger
  email/         Email provider interface + Resend + logger
  push/          Web Push sender
  realtime/      WebSocket server and Postgres LISTEN/NOTIFY
db/migrations/   SQL migration files (checked in)
scripts/         CLI tools (seed-admin)
tests/
  unit/          Vitest unit tests
  integration/   Vitest integration tests (real Postgres)
  e2e/           Playwright end-to-end tests
```

---

## License

Apache 2.0
