import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recoveryLinks, type RecoveryLink } from "@/lib/db/schema";

export async function createRecoveryLink(data: {
  userId: string;
  createdByUserId: string | null;
  tokenHash: string;
  expiresAt: Date;
}): Promise<RecoveryLink> {
  const results = await db.insert(recoveryLinks).values(data).returning();
  return results[0];
}

export async function findValidRecoveryLink(tokenHash: string): Promise<RecoveryLink | null> {
  const results = await db
    .select()
    .from(recoveryLinks)
    .where(
      and(
        eq(recoveryLinks.tokenHash, tokenHash),
        isNull(recoveryLinks.usedAt),
        gt(recoveryLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return results[0] ?? null;
}

export async function consumeRecoveryLink(id: string): Promise<void> {
  await db.update(recoveryLinks).set({ usedAt: new Date() }).where(eq(recoveryLinks.id, id));
}
