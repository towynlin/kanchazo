import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam } from "@/lib/db/queries/teams";
import { createEvent, deleteEvent } from "@/lib/db/queries/events";
import { getGameReportByEvent, saveGameReport } from "@/lib/db/queries/game-reports";

async function makeGame() {
  const coach = await createUser({ name: "Coach Test" });
  const team = await createTeam({ name: "Test Team", createdByUserId: coach.id });
  const event = await createEvent({
    teamId: team.id,
    kind: "game",
    startsAt: new Date(Date.now() - 86400000),
    location: "Stadium",
    opponentName: "Rivals",
    createdByUserId: coach.id,
  });
  return { coach, team, event };
}

describe("game report queries", () => {
  it("returns null when no report exists", async () => {
    const { event } = await makeGame();
    expect(await getGameReportByEvent(event.id)).toBeNull();
  });

  it("creates a report with baseVersion 0", async () => {
    const { coach, event } = await makeGame();
    const result = await saveGameReport(
      event.id,
      { ourScore: 3, opponentScore: 1, coachNotes: "Great defense" },
      0,
      coach.id,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.ourScore).toBe(3);
    expect(result.report.opponentScore).toBe(1);
    expect(result.report.coachNotes).toBe("Great defense");
    expect(result.report.version).toBe(1);
    expect(result.report.updatedByUserId).toBe(coach.id);
  });

  it("updates a report when baseVersion matches, bumping version", async () => {
    const { coach, event } = await makeGame();
    await saveGameReport(
      event.id,
      { ourScore: 1, opponentScore: 1, coachNotes: null },
      0,
      coach.id,
    );

    const other = await createUser({ name: "Assistant Coach" });
    const result = await saveGameReport(
      event.id,
      { ourScore: 2, opponentScore: 1, coachNotes: "Comeback win" },
      1,
      other.id,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.ourScore).toBe(2);
    expect(result.report.version).toBe(2);
    expect(result.report.updatedByUserId).toBe(other.id);
  });

  it("rejects a concurrent create (both coaches saw no report)", async () => {
    const { coach, event } = await makeGame();
    const other = await createUser({ name: "Assistant Coach" });

    const first = await saveGameReport(
      event.id,
      { ourScore: 3, opponentScore: 0, coachNotes: null },
      0,
      coach.id,
    );
    expect(first.ok).toBe(true);

    const second = await saveGameReport(
      event.id,
      { ourScore: 2, opponentScore: 0, coachNotes: null },
      0,
      other.id,
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.current?.ourScore).toBe(3);
    expect(second.current?.version).toBe(1);
  });

  it("rejects a stale update and returns the current report", async () => {
    const { coach, event } = await makeGame();
    const other = await createUser({ name: "Assistant Coach" });
    await saveGameReport(
      event.id,
      { ourScore: 1, opponentScore: 0, coachNotes: null },
      0,
      coach.id,
    );
    await saveGameReport(
      event.id,
      { ourScore: 2, opponentScore: 0, coachNotes: "Updated" },
      1,
      other.id,
    );

    // Coach still holds version 1 — their write must not clobber version 2.
    const stale = await saveGameReport(
      event.id,
      { ourScore: 9, opponentScore: 9, coachNotes: "Stale" },
      1,
      coach.id,
    );
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.current?.ourScore).toBe(2);
    expect(stale.current?.coachNotes).toBe("Updated");
    expect(stale.current?.version).toBe(2);

    // Retrying with the current version succeeds.
    const retry = await saveGameReport(
      event.id,
      { ourScore: 9, opponentScore: 9, coachNotes: "Merged" },
      2,
      coach.id,
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.report.version).toBe(3);
  });

  it("cascades delete when the event is deleted", async () => {
    const { coach, event } = await makeGame();
    await saveGameReport(
      event.id,
      { ourScore: 1, opponentScore: 0, coachNotes: null },
      0,
      coach.id,
    );
    await deleteEvent(event.id);
    expect(await getGameReportByEvent(event.id)).toBeNull();
  });
});
