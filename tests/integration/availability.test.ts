import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam, addTeamMember } from "@/lib/db/queries/teams";
import { createEvent } from "@/lib/db/queries/events";
import { createPlayer, addGuardian } from "@/lib/db/queries/players";
import {
  setAvailability,
  getEventAvailability,
  getAvailabilityForEventAndPlayer,
} from "@/lib/db/queries/availability";

describe("availability queries", () => {
  it("sets and retrieves availability", async () => {
    const coach = await createUser({ name: "Coach", phone: `+1415555${Math.floor(Math.random() * 9000 + 1000)}` });
    const team = await createTeam({ name: "Team", createdByUserId: coach.id });
    const player = await createPlayer({ teamId: team.id, name: "Alex" });
    const event = await createEvent({
      teamId: team.id, kind: "practice",
      startsAt: new Date(Date.now() + 86400000),
      location: "Field", createdByUserId: coach.id,
    });

    const avail = await setAvailability({
      eventId: event.id,
      playerId: player.id,
      status: "yes",
      updatedByUserId: coach.id,
    });
    expect(avail.status).toBe("yes");

    const all = await getEventAvailability(event.id);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("yes");
  });

  it("upserts availability on conflict", async () => {
    const coach = await createUser({ name: "Coach2", phone: `+1415555${Math.floor(Math.random() * 9000 + 1000)}` });
    const team = await createTeam({ name: "Team2", createdByUserId: coach.id });
    const player = await createPlayer({ teamId: team.id, name: "Morgan" });
    const event = await createEvent({
      teamId: team.id, kind: "practice",
      startsAt: new Date(Date.now() + 86400000),
      location: "Field", createdByUserId: coach.id,
    });

    await setAvailability({ eventId: event.id, playerId: player.id, status: "yes", updatedByUserId: coach.id });
    await setAvailability({ eventId: event.id, playerId: player.id, status: "no", updatedByUserId: coach.id });

    const result = await getAvailabilityForEventAndPlayer(event.id, player.id);
    expect(result?.status).toBe("no");
  });
});
