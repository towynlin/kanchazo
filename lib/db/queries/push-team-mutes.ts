import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushTeamMutes } from "@/lib/db/schema";

export async function muteTeamPush(userId: string, teamId: string) {
  await db.insert(pushTeamMutes).values({ userId, teamId }).onConflictDoNothing();
}

export async function unmuteTeamPush(userId: string, teamId: string) {
  await db
    .delete(pushTeamMutes)
    .where(and(eq(pushTeamMutes.userId, userId), eq(pushTeamMutes.teamId, teamId)));
}

export async function getMutedTeamIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: pushTeamMutes.teamId })
    .from(pushTeamMutes)
    .where(eq(pushTeamMutes.userId, userId));
  return rows.map((r) => r.teamId);
}

export async function getNonMutedSubscriptions(userIds: string[], teamId: string) {
  if (userIds.length === 0) return [];
  const { pushSubscriptions } = await import("@/lib/db/schema");

  // Users who have muted this team
  const muted = await db
    .select({ userId: pushTeamMutes.userId })
    .from(pushTeamMutes)
    .where(and(inArray(pushTeamMutes.userId, userIds), eq(pushTeamMutes.teamId, teamId)));
  const mutedIds = new Set(muted.map((r) => r.userId));
  const activeIds = userIds.filter((id) => !mutedIds.has(id));
  if (activeIds.length === 0) return [];

  return db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, activeIds));
}
