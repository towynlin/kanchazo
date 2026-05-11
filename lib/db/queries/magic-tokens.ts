import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { magicTokens, type MagicToken } from "@/lib/db/schema";

export async function createMagicToken(data: {
  phone: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<MagicToken> {
  const results = await db.insert(magicTokens).values(data).returning();
  return results[0];
}

export async function findUnusedMagicToken(tokenHash: string): Promise<MagicToken | null> {
  const now = new Date();
  const results = await db
    .select()
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.tokenHash, tokenHash),
        isNull(magicTokens.usedAt),
        gt(magicTokens.expiresAt, now),
      ),
    )
    .limit(1);
  return results[0] ?? null;
}

export async function consumeMagicToken(id: string): Promise<void> {
  await db.update(magicTokens).set({ usedAt: new Date() }).where(eq(magicTokens.id, id));
}

export async function countRecentMagicTokens(
  phone: string,
  since: Date,
): Promise<number> {
  const results = await db
    .select()
    .from(magicTokens)
    .where(and(eq(magicTokens.phone, phone), gt(magicTokens.createdAt, since)));
  return results.length;
}
