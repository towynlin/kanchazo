import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatMessages, chatReads, users, type ChatMessage } from "@/lib/db/schema";

export interface ChatMessageWithSender extends ChatMessage {
  senderName: string | null;
}

export async function sendMessage(data: {
  teamId: string;
  senderUserId: string;
  body: string;
}): Promise<ChatMessage> {
  const results = await db.insert(chatMessages).values(data).returning();
  return results[0];
}

export async function getMessages(
  teamId: string,
  opts: { limit?: number; before?: Date } = {},
): Promise<ChatMessageWithSender[]> {
  const conditions = [eq(chatMessages.teamId, teamId)];
  if (opts.before) {
    conditions.push(gt(chatMessages.sentAt, opts.before));
  }
  const rows = await db
    .select({ message: chatMessages, sender: users })
    .from(chatMessages)
    .leftJoin(users, eq(users.id, chatMessages.senderUserId))
    .where(and(...conditions))
    .orderBy(asc(chatMessages.sentAt))
    .limit(opts.limit ?? 100);
  return rows.map((r) => ({ ...r.message, senderName: r.sender?.name ?? null }));
}

export async function getLatestMessage(teamId: string): Promise<ChatMessage | null> {
  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.teamId, teamId))
    .orderBy(desc(chatMessages.sentAt))
    .limit(1);
  return results[0] ?? null;
}

export async function updateChatRead(
  userId: string,
  teamId: string,
  lastReadMessageId: string,
): Promise<void> {
  await db
    .insert(chatReads)
    .values({ userId, teamId, lastReadMessageId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [chatReads.userId, chatReads.teamId],
      set: { lastReadMessageId, updatedAt: new Date() },
    });
}

export async function getChatRead(
  userId: string,
  teamId: string,
): Promise<{ lastReadMessageId: string | null } | null> {
  const rows = await db
    .select()
    .from(chatReads)
    .where(and(eq(chatReads.userId, userId), eq(chatReads.teamId, teamId)))
    .limit(1);
  return rows[0] ?? null;
}
