import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

export async function upsertPushSubscription(data: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  await db
    .insert(pushSubscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
    });
}

export async function deletePushSubscription(endpoint: string, userId: string) {
  await db
    .delete(pushSubscriptions)
    .where(
      eq(pushSubscriptions.endpoint, endpoint) && eq(pushSubscriptions.userId, userId)
        ? eq(pushSubscriptions.endpoint, endpoint)
        : eq(pushSubscriptions.endpoint, ""),
    );
}

export async function getPushSubscriptionsForUser(userId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function getPushSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { inArray } = await import("drizzle-orm");
  return db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
}

export async function removeStaleSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
