import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invitations, type Invitation, type NewInvitation } from "@/lib/db/schema";

export async function createInvitation(data: NewInvitation): Promise<Invitation> {
  const results = await db.insert(invitations).values(data).returning();
  return results[0];
}

export async function findInvitationByTokenHash(tokenHash: string): Promise<Invitation | null> {
  const results = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);
  return results[0] ?? null;
}

export async function consumeInvitation(id: string, usedByUserId: string): Promise<void> {
  await db
    .update(invitations)
    .set({ usedAt: new Date(), usedByUserId })
    .where(eq(invitations.id, id));
}
