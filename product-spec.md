# Youth Sports Team Manager — Product Spec

> A mobile-first, invite-only PWA for parents and coaches to manage youth sports team schedules, availability, rosters, and chat. No payments, no public registration. Open source.

## 1. Overview & goals

- Mobile-first web app (PWA). Usage is almost entirely on iPhone/Android browsers.
- Invite-only. No self-service registration. No money.
- Auth via passkeys only — no passwords, no SMS. Recovery codes and coach-issued sign-in links as fallbacks.
- Three primary screens per team: **Schedule**, **Roster**, **Chat**. Plus a persistent team selector.
- Open source on GitHub. Easy to deploy. CI + red-green TDD throughout.
- Future-proof toward native iOS/Android apps, but ship a great PWA first.

## 2. Glossary

- **User** — a real adult: parent, guardian, or coach. Has name and optional email/phone contact info.
- **Player** — a child on a team. Has only a name; no contact info is collected for children.
- **Team** — a named group of users, players, coaches, and events.
- **Event** — a game or practice belonging to one team. Has date, time, location.
- **Coach** — a user with elevated permissions on a specific team. Coach role is per-team.
- **System Admin** — a privileged operator who bootstraps the system by inviting the first coach (or any new coach for a new team).

## 3. Roles & permissions

A user's role is **per team**. The same person can be a coach on team A and a regular parent on team B.

| Capability                                       | Parent | Coach | System Admin |
| ------------------------------------------------ | ------ | ----- | ------------ |
| View their teams' schedule, roster, chat         | ✅     | ✅    | —            |
| Edit own contact info                            | ✅     | ✅    | ✅           |
| Edit own players' name & availability            | ✅     | ✅    | —            |
| View all players' availability on team           | ✅     | ✅    | —            |
| Edit any player on the team                      | —      | ✅    | —            |
| Create / edit / cancel events                    | —      | ✅    | —            |
| Edit event notes                                 | —      | ✅    | —            |
| Invite co-guardian for own player                | ✅     | ✅    | —            |
| Create teams                                     | —      | ✅    | —            |
| Invite coaches to a team they coach              | —      | ✅    | —            |
| Invite parents to a team they coach              | —      | ✅    | —            |
| Invite a coach for a new team (new "team owner") | —      | —     | ✅           |

## 4. Data model (logical)

```
User                    id, name, email, phone (E.164, unique), created_at
Passkey                 id, user_id, credential_id, public_key, sign_count, ...
Team                    id, name, time_zone, created_by_user_id, created_at
TeamMembership          id, team_id, user_id, role (parent|coach), joined_at
Player                  id, team_id, name, created_at
PlayerGuardian          id, player_id, user_id        -- many-to-many
Event                   id, team_id, kind (game|practice), starts_at (timestamptz),
                        ends_at (nullable), location, opponent_name (game only),
                        is_home (game only), notes (text), status (scheduled|cancelled),
                        created_by_user_id, updated_by_user_id, updated_at
Availability            id, event_id, player_id, status (yes|no|maybe, default maybe),
                        updated_by_user_id, updated_at
                        -- unique (event_id, player_id)
ChatMessage             id, team_id, sender_user_id, body, sent_at
ChatRead                user_id, team_id, last_read_message_id, updated_at
                        -- unique (user_id, team_id)
Invitation              id, team_id (nullable for admin-issued coach-of-new-team),
                        inviter_user_id (nullable for admin), invited_role,
                        contact_phone (nullable), contact_email (nullable),
                        intended_player_ids (nullable, for parent invites),
                        token_hash, expires_at, used_at, used_by_user_id
AuditLog                id, actor_user_id, team_id, action, target, payload, at
Session                 id, user_id, token_hash, created_at, expires_at, last_seen_at
```

Constraints:

- Phone numbers, when provided, are stored normalized E.164. They are optional, unverified contact info for the roster — never an identity credential.
- A `Player` always belongs to exactly one `Team` and has at least one `PlayerGuardian`.
- Deleting a team hard-deletes all its events, players, memberships, chat. Document this; require typed confirmation.

## 5. Authentication

### 5.1 Passkeys (the only sign-in method)

- No passwords, no SMS, no OTPs. Use WebAuthn via `@simplewebauthn/server` + `@simplewebauthn/browser`.
- New users register their first passkey immediately after accepting an invite (`/auth/setup`).
- A user may register multiple passkeys (one per device); manage them from Settings.
- The sign-in screen is a single "Sign in with passkey" CTA.

### 5.2 Account recovery

- **Recovery codes.** Eight single-use codes issued at signup (and regenerable from Settings; regeneration invalidates previous codes). Stored as `sha256(normalized code)`. Redeemed at `/auth/recover`, which signs the user in and prompts them to register a fresh passkey. Redemption attempts are rate-limited.
- **Recovery links.** For members who lose passkey _and_ codes: any coach on their team can generate a single-use, 24-hour sign-in link from the roster ("Help sign in") and share it over a side channel they trust (text, WhatsApp, in person). Works for parents and fellow coaches alike. A sysadmin can mint the same link from the CLI (`scripts/recovery-link.ts`). The landing page requires an explicit tap to consume the link so messenger link previews can't burn it.

### 5.3 Sessions

- Server-side session table; cookie carries opaque session id.
- "Sign out everywhere" button in Settings invalidates all sessions for the user.

## 6. Screens & flows

### 6.1 Persistent team header

- Always visible at the top: the **current team name** and a small chevron.
- Tap the header → bottom sheet listing all the user's teams → tap to switch.
- If the user has only one team: header still shows the team name, chevron is hidden.
- Last-selected team is remembered per device (localStorage), then per-account on the server as a fallback.

### 6.2 Schedule (default landing per team)

A vertical, scrollable list of events for the current team.

- Past events are hidden by default. A "Past events" link/button at the top opens an archive view (separate route or sheet).
- Today's events appear above the fold. Future events scroll below.
- Sort: ascending by `starts_at`. Group by date with sticky date headers.
- Each row, compact:
  - Date and time (omit date in the row when grouped under a date header; show start–end if `ends_at` present).
  - Location.
  - Kind: **Practice** or **Game**. For games: `vs Opponent (Home)` or `@ Opponent (Away)`.
  - **Inline availability control(s) for this user's player(s) on this team only.**
    - One player → single yes/no/maybe segmented control.
    - Multiple players → stacked compact rows, each labeled with the player's first name.
    - Single tap to set a value. Optimistic UI; rollback + toast on server error.
- Tapping the event body (anywhere outside the availability controls) opens **Event detail**.
- Cancelled events render with a `Cancelled` badge and strikethrough but remain visible until past.

### 6.3 Event detail

- All event fields, prominently displayed.
- A list of every player on the team with their current availability.
  - The user can edit only their own players' availability here (same control style as schedule).
  - Other players are read-only.
  - Counts at the top: `12 yes · 3 maybe · 2 no · 1 unanswered`.
- **Notes**:
  - Coaches: editable inline. Save on blur or explicit "Save". Last-write-wins; show `Edited HH:MM by <coach name>`.
  - Non-coaches: read-only.
- Coaches see additional actions: **Edit event**, **Cancel event** (sets status, preserves availability history), **Delete event** (hard delete, requires confirm).

### 6.4 Roster

- Two sections: **Coaches** first, then **Parents/guardians**.
- Within each section, sort users alphabetically by name.
- Per user row, show:
  - Name.
  - Email — tap → mailto:; long-press / explicit copy icon → copy.
  - Phone — primary tap → tel:; secondary action → copy.
  - Players guarded by this user (alphabetical), shown as a small chip list under the contact info.
- Make copy targets large and obvious; mobile users will paste into Messages, Mail, Contacts.

### 6.5 Chat

- One group chat per team. All team members participate; no DMs in v1.
- Live updates over WebSocket. Reconnect with backoff; reconcile missed messages on reconnect by polling since `last_known_message_id`.
- Each message: sender name, body (plain text, URLs auto-linkified client-side), sent time (relative for today, absolute for older).
- Track `last_read_message_id` per (user, team). Update when:
  - User scrolls to the bottom and stays there briefly, or
  - User sends a message, or
  - User leaves the chat view with the latest message rendered.
- Show an unread badge on the chat tab and a **"New messages"** divider in-thread.
- v1 keeps it simple: no edit, no delete, no reactions, no attachments. Plain text only.

### 6.6 Settings

- Edit own name, email, phone (plain contact info shown on the roster; no verification).
- Manage passkeys (list, add, remove).
- Generate new recovery codes (shown once; replaces previous codes).
- Sign out / sign out everywhere.
- Notification preferences (see §8).

## 7. Invitations & onboarding

### 7.1 Invite types

- **System admin → coach (new team owner).** CLI in v1; creates an `Invitation` with `team_id = null`, `invited_role = coach`. On accept, the new coach is prompted to create their first team.
- **Coach → coach (same team).** In-app form on the team's roster page.
- **Coach → parent (their team).** In-app form on the team's roster page. Fields: one or more **player names** to associate, plus an optional email. Player rows are created on invite send so the roster reflects them immediately; if the invite expires unused, the orphan players remain visible to the coach with a "pending guardian" badge and a resend action.
- **Parent → parent (co-guardian for own player).** From a player's profile, "Add another guardian": choose the player(s) to share, get a link to send.

Every invite produces a **shareable link** shown to the inviter with copy/share actions — the inviter delivers it over whatever channel they already use with that person. Adding an email additionally sends the link by email.

### 7.2 Invitation tokens

- 32 random bytes, base64url-encoded in the link, stored as `sha256(token)`.
- 7-day expiry by default; single use.
- Resending an invite issues a fresh token and invalidates the old one.

### 7.3 First-time signup from invite

1. User opens the invite link. If already signed in, the membership is added to that account.
2. Otherwise, they enter their name (plus optional phone for the roster) and the account is created. Add team membership and link to any pre-created players.
3. They land on `/auth/setup`: register a passkey, then save their recovery codes.
4. Land on Schedule for that team.

## 8. Notifications (recommended additions — see §13)

The brief doesn't mention notifications, but a sports app is materially weaker without them.

- Web Push via the browser Push API. iOS supports this on PWAs added to the Home Screen since iOS 16.4.
- Triggers: new chat message (debounced), event created/cancelled by coach, event time/location changes within the next 24h.
- Per-user toggles per team in Settings.
- Onboarding step explains "Add to Home Screen" on iOS so push works.

## 9. Recommended tech stack

I'm picking concrete choices so Claude Code has clear marching orders. Override anything that doesn't fit.

- **App framework**: Next.js 15 (App Router) + TypeScript. PWA-enabled via `next-pwa` or a hand-rolled service worker. Single repo, single deploy.
- **Styling**: Tailwind CSS, mobile-first, large tap targets (min 44×44 px). Use native `<input type="datetime-local">` for events.
- **DB**: PostgreSQL.
- **ORM**: Drizzle (SQL-first, light) — preferred. Prisma is acceptable.
- **Real-time** (chat live updates):
  - Server-side WebSocket route in Next.js (Node runtime), backed by Postgres `LISTEN/NOTIFY`. Lowest dependency cost; works fine on Fly.io.
- **Email** (some invites): Resend or Postmark, behind an `EmailProvider` interface; ship a `LoggerEmailProvider` for local dev that prints links to the console (no credentials needed to develop).
- **Passkeys**: `@simplewebauthn/server` + `@simplewebauthn/browser`.
- **Validation**: Zod on every server boundary.
- **Logging**: pino, structured JSON to stdout.
- **Hosting**:
  - **Fly.io** — Docker-native, has Postgres, region flexibility.

### 9.1 Why a PWA, not React Native, in v1

A PWA covers the brief: schedule, roster, availability taps, chat, push (iOS 16.4+). When you later want App Store presence and richer native integration, wrap the same web app with **Capacitor** (smallest jump) or rebuild key screens in **Expo / React Native**. Keep components platform-neutral (no heavy DOM-specific deps in domain code) to ease that path.

## 10. Security & privacy

- All traffic over HTTPS. HSTS, sensible CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Phone numbers are PII; store normalized E.164. Never log message bodies.
- All authentication tokens (sessions, recovery codes, recovery links, invites) stored as `sha256(token)`; raw token only ever in transit.
- Rate limiting on: recovery code/link redemption, login attempts, invite generation, chat send.
- **Children's data minimization**: store only player name. No DOB, no contact info, no photos in v1. Document this in the privacy policy. (Mitigates COPPA exposure.)
- Audit log for coach actions: event create/edit/delete, notes edit, member removal.
- Secrets only via environment variables; provide `.env.example`. Never commit `.env`.
- Dependabot + GitHub secret scanning + `npm audit` in CI.
- Provide a "delete my account" flow that anonymizes chat (`sender_name = "Former member"`) and removes the user; document the policy.

## 11. Deployment & ops

- Single multi-stage `Dockerfile` building the Next.js app.
- `compose.yml` for local development: app + Postgres (no external credentials needed).
- One-command bootstrap: `make dev` runs migrations, seeds an admin, starts the server.
- Migrations checked in. `npm run migrate` applied automatically on container boot.
- `/healthz` endpoint returning DB connectivity status.
- Backup guidance: nightly `pg_dump` for self-hosters; managed backups on Fly.io / Neon.

## 12. Testing & CI

- **Red-green TDD throughout.** Write the failing test first, then the implementation.
- **Unit (Vitest)**: pure domain logic — role checks, availability transitions, invite expiry, phone normalization. Target ≥90% line coverage on `lib/`.
- **Integration (Vitest + real Postgres)**: DB-touching code paths. CI uses a `postgres:16` service. Truncate between tests; do not stub the DB.
- **E2E (Playwright, mobile viewport)**: invite → first login → set availability → coach creates event → chat round-trip across two browser contexts.
- **CI: GitHub Actions** with parallel jobs:
  1. lint + typecheck
  2. unit + integration (Postgres service)
  3. E2E (Playwright)
  4. build
- Pre-commit: lint-staged + prettier + tsc.
- Never call external providers in tests — assert on the in-memory logger provider's outbox.

## 13. Recommended additions beyond the brief

Sorted by ROI. All optional; flag if any should drop.

1. **Push notifications** (§8). Sports teams live on these.
2. **iCal feed per user** — read-only token URL that aggregates events across all the user's teams. One-line Apple/Google Calendar subscribe. Very high value, low cost.
3. **Recurring practices** ("every Tuesday 6pm until <date>"). Coach-only. Stored as a series + materialized event rows.
4. **Cancellation distinct from deletion** (already in §6.3). Required so availability history isn't lost.
5. **Per-team time zone** (already in §4). Without this, a team that travels or daylight-saving boundaries break.

## 14. Out of scope (v1)

- Payments / dues / fundraising.
- Game scores and stats.
- Player photos or avatars.
- Public team pages.
- DMs and chat reactions.
- Email-only login.
- Multi-language UI (English only in v1).

## 15. Decisions with flexibility

1. **Geography** — US-only initially.
2. **Player creation timing** — create-on-invite, link-on-accept
3. **Co-guardian removal** — if mom invites dad and they later split, who can remove whom? Recommend: anyone can remove themselves; coaches can remove any guardian after a typed confirmation.
4. **Past data retention** — keep chat & past events forever? Recommend yes, with explicit "delete team" only.
5. **Notifications in v1 or v1.1?** Recommend v1 behind a feature flag if scope is tight.
6. **iCal feed in v1 or v1.1?** Recommend v1.
7. **Real-time stack** — WS+LISTEN/NOTIFY

## 16. Suggested directory layout

```
/app                 Next.js App Router (pages, API routes, layouts)
/components          shared UI
/lib
  /auth              sessions, passkeys, recovery codes & links
  /db                Drizzle schema + queries
  /email             provider interface + Resend impl
  /realtime          WS server + client
  /domain            pure logic (role checks, availability, invites)
/db/migrations
/tests
  /unit /integration /e2e
.github/workflows/ci.yml
Dockerfile
compose.yml
.env.example
Makefile
```
