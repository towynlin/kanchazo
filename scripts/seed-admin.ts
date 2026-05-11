#!/usr/bin/env tsx
/**
 * Bootstrap script: create an invitation for the first coach.
 * Usage: DATABASE_URL=... ADMIN_PHONE=+15555550100 tsx scripts/seed-admin.ts <coach-phone>
 *
 * This issues a system-admin invitation (teamId = null) for the given phone number.
 * The recipient taps the SMS link, creates their account, and is prompted to create
 * their first team.
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../lib/db/schema";
import { createInvitation } from "../lib/db/queries/invitations";
import { normalizePhone } from "../lib/domain/phone";
import { generateToken } from "../lib/auth/tokens";
import { INVITE_EXPIRY_DAYS } from "../lib/domain/invites";
import { LoggerSmsProvider } from "../lib/sms/logger";
import path from "path";

const coachPhone = process.argv[2];
if (!coachPhone) {
  console.error("Usage: tsx scripts/seed-admin.ts <coach-phone>");
  process.exit(1);
}

const phone = normalizePhone(coachPhone);
if (!phone) {
  console.error("Invalid phone number:", coachPhone);
  process.exit(1);
}

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
    contactPhone: phone,
    contactEmail: null,
    intendedPlayerIds: null,
    tokenHash: hash,
    expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/invite/${token}`;

  const sms = new LoggerSmsProvider();
  await sms.sendInvite(phone!, "System Admin", url);

  console.log(`\n✅ Invitation created for ${phone}`);
  console.log(`   ID:      ${invitation.id}`);
  console.log(`   Expires: ${expiresAt.toISOString()}`);
  console.log(`   Link:    ${url}\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
