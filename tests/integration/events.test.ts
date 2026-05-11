import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam } from "@/lib/db/queries/teams";
import {
  createEvent,
  getTeamEvents,
  updateEvent,
  deleteEvent,
  getEventById,
} from "@/lib/db/queries/events";

async function makeTeamAndCoach() {
  const coach = await createUser({
    name: "Coach Test",
    phone: `+1415555${Math.floor(Math.random() * 9000 + 1000)}`,
  });
  const team = await createTeam({ name: "Test Team", createdByUserId: coach.id });
  return { coach, team };
}

describe("events queries", () => {
  it("creates and retrieves an event", async () => {
    const { coach, team } = await makeTeamAndCoach();
    const startsAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const event = await createEvent({
      teamId: team.id,
      kind: "practice",
      startsAt,
      location: "Main Field",
      createdByUserId: coach.id,
    });
    expect(event.id).toBeTruthy();
    expect(event.kind).toBe("practice");

    const found = await getEventById(event.id);
    expect(found?.location).toBe("Main Field");
  });

  it("lists only future events by default", async () => {
    const { coach, team } = await makeTeamAndCoach();
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);

    await createEvent({
      teamId: team.id,
      kind: "practice",
      startsAt: future,
      location: "A",
      createdByUserId: coach.id,
    });
    await createEvent({
      teamId: team.id,
      kind: "practice",
      startsAt: past,
      location: "B",
      createdByUserId: coach.id,
    });

    const events = await getTeamEvents(team.id);
    expect(events).toHaveLength(1);
    expect(events[0].location).toBe("A");
  });

  it("updates an event", async () => {
    const { coach, team } = await makeTeamAndCoach();
    const event = await createEvent({
      teamId: team.id,
      kind: "practice",
      startsAt: new Date(Date.now() + 86400000),
      location: "Old Field",
      createdByUserId: coach.id,
    });

    const updated = await updateEvent(event.id, {
      location: "New Field",
      updatedByUserId: coach.id,
    });
    expect(updated?.location).toBe("New Field");
  });

  it("cancels an event", async () => {
    const { coach, team } = await makeTeamAndCoach();
    const event = await createEvent({
      teamId: team.id,
      kind: "game",
      startsAt: new Date(Date.now() + 86400000),
      location: "Stadium",
      createdByUserId: coach.id,
    });

    const cancelled = await updateEvent(event.id, { status: "cancelled" });
    expect(cancelled?.status).toBe("cancelled");
  });

  it("deletes an event", async () => {
    const { coach, team } = await makeTeamAndCoach();
    const event = await createEvent({
      teamId: team.id,
      kind: "practice",
      startsAt: new Date(Date.now() + 86400000),
      location: "Field",
      createdByUserId: coach.id,
    });

    await deleteEvent(event.id);
    expect(await getEventById(event.id)).toBeNull();
  });
});
