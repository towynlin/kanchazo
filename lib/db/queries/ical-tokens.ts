import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { icalTokens } from "@/lib/db/schema";
import { generateToken } from "@/lib/auth/tokens";

export async function getOrCreateIcalToken(userId: string): Promise<string> {
  const existing = await db
    .select()
    .from(icalTokens)
    .where(eq(icalTokens.userId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0].tokenHash;
  }

  const { hash } = generateToken();
  await db.insert(icalTokens).values({ userId, tokenHash: hash });
  return hash;
}

export async function findUserByIcalToken(token: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(icalTokens)
    .where(eq(icalTokens.tokenHash, token))
    .limit(1);
  return rows[0]?.userId ?? null;
}
