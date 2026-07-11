#!/usr/bin/env tsx
/**
 * Sysadmin script: create a single-use sign-in (recovery) link for a user who
 * lost their passkey and recovery codes.
 * Usage: DATABASE_URL=... tsx scripts/recovery-link.ts <user-id-or-email>
 *
 * Prints the link; send it to the user over a channel you trust. It works once
 * and expires in 24 hours.
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { generateToken } from "../lib/auth/tokens";

const RECOVERY_LINK_EXPIRY_HOURS = 24;

const identifier = process.argv[2];
if (!identifier) {
  console.error("Usage: tsx scripts/recovery-link.ts <user-id-or-email>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

async function main() {
  const rows = await db
    .select()
    .from(schema.users)
    .where(isUuid ? eq(schema.users.id, identifier) : eq(schema.users.email, identifier))
    .limit(2);

  if (rows.length === 0) {
    console.error(`No user found for ${identifier}`);
    process.exit(1);
  }
  if (rows.length > 1) {
    console.error(`Multiple users match ${identifier}; use the user id instead.`);
    process.exit(1);
  }
  const user = rows[0];

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + RECOVERY_LINK_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(schema.recoveryLinks).values({
    userId: user.id,
    createdByUserId: null, // system admin
    tokenHash: hash,
    expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`\n✅ Recovery link created for ${user.name} (${user.id})`);
  console.log(`   Expires: ${expiresAt.toISOString()}`);
  console.log(`   Link:    ${appUrl}/recover/${token}`);
  console.log(`\n   Send this link to them over a channel you trust. It works once.\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
