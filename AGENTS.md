# Agent guidelines

## Next.js 15 — one breaking change that matters

`params` and `searchParams` in route handlers and page components are **async Promises**, not plain objects. Always `await params` before destructuring:

```ts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
```

The existing routes in `app/api/` and `app/(app)/` are all correct — read those before writing new ones.

---

## Always run Prettier before committing

CI runs `prettier --check` and will fail if formatting is off. Run:

```bash
npx prettier --write <files>
```

before every commit. Common trigger: chained promise style — Prettier reformats `.then().catch()` chains even when the logic is correct.

---

## Drizzle ORM: use `and()`, never JS `&&`

JS `&&` between two Drizzle SQL fragments evaluates to the **second operand** (always truthy as a condition), silently dropping the first clause. Always use Drizzle's `and()`:

```ts
// Wrong — only filters by endpoint, userId is ignored
.where(eq(t.endpoint, ep) && eq(t.userId, uid) ? eq(t.endpoint, ep) : ...)

// Correct
.where(and(eq(t.endpoint, ep), eq(t.userId, uid)))
```

---

## Phone validation happens before business logic

`libphonenumber-js` rejects structurally invalid numbers with **400** before any invite-gate or auth logic runs. Tests that expect a 403 invite-gate response must use a *valid* E.164 number (e.g. `+14155550199`), not a placeholder like `+15550000000`.

---

## Manual migrations: update the journal

When writing a migration SQL file by hand (rather than via `npm run db:generate`), also add an entry to `db/migrations/meta/_journal.json`. Without it, Drizzle Kit won't apply the file.

---

## `make migrate` needs DATABASE_URL

The Makefile does not source `.env`. When running migrations outside of `make dev`, pass the URL explicitly:

```bash
DATABASE_URL=postgres://kanchazo:kanchazo@localhost:5432/kanchazo npx drizzle-kit migrate
```
