import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { availability, type Availability } from "@/lib/db/schema";

export async function setAvailability(data: {
  eventId: string;
  playerId: string;
  status: "yes" | "no" | "maybe";
  updatedByUserId: string;
}): Promise<Availability> {
  const results = await db
    .insert(availability)
    .values({ ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [availability.eventId, availability.playerId],
      set: { status: data.status, updatedByUserId: data.updatedByUserId, updatedAt: new Date() },
    })
    .returning();
  return results[0];
}

export async function getEventAvailability(eventId: string): Promise<Availability[]> {
  return db.select().from(availability).where(eq(availability.eventId, eventId));
}

export async function getPlayerAvailability(playerId: string): Promise<Availability[]> {
  return db.select().from(availability).where(eq(availability.playerId, playerId));
}

export async function getAvailabilityForEventAndPlayer(
  eventId: string,
  playerId: string,
): Promise<Availability | null> {
  const results = await db
    .select()
    .from(availability)
    .where(and(eq(availability.eventId, eventId), eq(availability.playerId, playerId)))
    .limit(1);
  return results[0] ?? null;
}
