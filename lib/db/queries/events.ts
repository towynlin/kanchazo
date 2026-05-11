import { and, asc, eq, gt, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events, type Event, type NewEvent } from "@/lib/db/schema";

export async function createEvent(data: NewEvent): Promise<Event> {
  const results = await db.insert(events).values(data).returning();
  return results[0];
}

export async function getEventById(id: string): Promise<Event | null> {
  const results = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return results[0] ?? null;
}

export async function getTeamEvents(
  teamId: string,
  opts: { includePast?: boolean } = {},
): Promise<Event[]> {
  const conditions = [eq(events.teamId, teamId)];
  if (!opts.includePast) {
    conditions.push(gt(events.startsAt, new Date()));
  }
  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.startsAt));
}

export async function getPastTeamEvents(teamId: string): Promise<Event[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.teamId, teamId), lte(events.startsAt, new Date())))
    .orderBy(asc(events.startsAt));
}

export async function updateEvent(
  id: string,
  data: Partial<
    Pick<
      Event,
      | "kind"
      | "startsAt"
      | "endsAt"
      | "location"
      | "opponentName"
      | "isHome"
      | "notes"
      | "notesUpdatedAt"
      | "notesEditorId"
      | "status"
      | "updatedByUserId"
    >
  >,
): Promise<Event | null> {
  const results = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return results[0] ?? null;
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
