import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { afterAll, afterEach } from "vitest";
import { sql } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://kanchazo:kanchazo@localhost:5432/kanchazo_test";

export const testPool = new Pool({ connectionString: DATABASE_URL });
export const testDb = drizzle(testPool, { schema });

afterEach(async () => {
  await testDb.execute(sql`
    TRUNCATE TABLE
      audit_log,
      chat_reads,
      chat_messages,
      availability,
      events,
      player_guardians,
      players,
      invitations,
      team_memberships,
      teams,
      magic_tokens,
      sessions,
      passkeys,
      users
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await testPool.end();
});
