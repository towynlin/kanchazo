#!/usr/bin/env tsx
/**
 * Bootstrap script: create an invitation for the first coach.
 * Usage: DATABASE_URL=... tsx scripts/seed-admin.ts
 *
 * This issues a system-admin invitation (teamId = null) and prints the invite link.
 * Send the link to the first coach over any channel; they open it, create their
 * account + passkey, and are prompted to create their first team.
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../lib/db/schema";
import { createInvitation } from "../lib/db/queries/invitations";
import { generateToken } from "../lib/auth/tokens";
import { INVITE_EXPIRY_DAYS } from "../lib/domain/invites";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  // Run migrations first
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../db/migrations") });

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await createInvitation({
    teamId: null,
    inviterUserId: null,
    invitedRole: "coach",
    contactPhone: null,
    contactEmail: null,
    intendedPlayerIds: null,
    tokenHash: hash,
    expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/invite/${token}`;

  console.log(`\n✅ Coach invitation created`);
  console.log(`   ID:      ${invitation.id}`);
  console.log(`   Expires: ${expiresAt.toISOString()}`);
  console.log(`   Link:    ${url}`);
  console.log(`\n   Send this link to the coach over any channel.\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
