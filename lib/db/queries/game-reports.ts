import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gameReports, type GameReport } from "@/lib/db/schema";

export interface GameReportInput {
  ourScore: number | null;
  opponentScore: number | null;
  coachNotes: string | null;
}

export type SaveGameReportResult =
  { ok: true; report: GameReport } | { ok: false; conflict: true; current: GameReport | null };

export async function getGameReportByEvent(eventId: string): Promise<GameReport | null> {
  const results = await db
    .select()
    .from(gameReports)
    .where(eq(gameReports.eventId, eventId))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Create or update the report for an event with optimistic concurrency.
 * `baseVersion` is the version the caller's edit was based on (0 = the caller
 * saw no report yet). If another coach saved in the meantime the write is
 * rejected and the currently stored report is returned so the caller can
 * reconcile.
 */
export async function saveGameReport(
  eventId: string,
  data: GameReportInput,
  baseVersion: number,
  updatedByUserId: string,
): Promise<SaveGameReportResult> {
  if (baseVersion === 0) {
    const inserted = await db
      .insert(gameReports)
      .values({ eventId, ...data, version: 1, updatedByUserId })
      .onConflictDoNothing({ target: gameReports.eventId })
      .returning();
    if (inserted[0]) return { ok: true, report: inserted[0] };
    // Someone else created the report first.
    return { ok: false, conflict: true, current: await getGameReportByEvent(eventId) };
  }

  const updated = await db
    .update(gameReports)
    .set({
      ...data,
      version: sql`${gameReports.version} + 1`,
      updatedByUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(gameReports.eventId, eventId), eq(gameReports.version, baseVersion)))
    .returning();
  if (updated[0]) return { ok: true, report: updated[0] };
  // Version moved on (or the report was deleted) since the caller loaded it.
  return { ok: false, conflict: true, current: await getGameReportByEvent(eventId) };
}
