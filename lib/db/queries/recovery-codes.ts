import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recoveryCodes, type RecoveryCode } from "@/lib/db/schema";

export async function replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
    await tx.insert(recoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })));
  });
}

export async function findUnusedRecoveryCode(codeHash: string): Promise<RecoveryCode | null> {
  const results = await db
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.codeHash, codeHash), isNull(recoveryCodes.usedAt)))
    .limit(1);
  return results[0] ?? null;
}

export async function consumeRecoveryCode(id: string): Promise<void> {
  await db.update(recoveryCodes).set({ usedAt: new Date() }).where(eq(recoveryCodes.id, id));
}

export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  const results = await db
    .select({ id: recoveryCodes.id })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
  return results.length;
}
