import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, type Session } from "@/lib/db/schema";

export async function createSession(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<Session> {
  const results = await db.insert(sessions).values(data).returning();
  return results[0];
}

export async function findSessionByTokenHash(tokenHash: string): Promise<Session | null> {
  const now = new Date();
  const results = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  return results[0] ?? null;
}

export async function touchSession(id: string, newExpiresAt: Date): Promise<void> {
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date(), expiresAt: newExpiresAt })
    .where(eq(sessions.id, id));
}

export async function expireSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function expireAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
