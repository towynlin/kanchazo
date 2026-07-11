import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import {
  createTeam,
  updateTeam,
  getTeamById,
  getTeamsByUser,
  addTeamMember,
  getTeamMembers,
  getTeamMembership,
} from "@/lib/db/queries/teams";

describe("teams queries", () => {
  it("creates a team", async () => {
    const coach = await createUser({ name: "Coach Kim", phone: "+14155550201" });
    const team = await createTeam({ name: "Tigers", createdByUserId: coach.id });
    expect(team.id).toBeTruthy();
    expect(team.name).toBe("Tigers");
  });

  it("gets teams for a user via membership", async () => {
    const coach = await createUser({ name: "Coach Lee", phone: "+14155550202" });
    const team = await createTeam({ name: "Lions", createdByUserId: coach.id });
    await addTeamMember({ teamId: team.id, userId: coach.id, role: "coach" });

    const teams = await getTeamsByUser(coach.id);
    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe("Lions");
  });

  it("gets team members with user info", async () => {
    const coach = await createUser({ name: "Coach Park", phone: "+14155550203" });
    const parent = await createUser({ name: "Parent Jordan", phone: "+14155550204" });
    const team = await createTeam({ name: "Bears", createdByUserId: coach.id });
    await addTeamMember({ teamId: team.id, userId: coach.id, role: "coach" });
    await addTeamMember({ teamId: team.id, userId: parent.id, role: "parent" });

    const members = await getTeamMembers(team.id);
    expect(members).toHaveLength(2);
    const coachMember = members.find((m) => m.userId === coach.id);
    expect(coachMember?.role).toBe("coach");
    expect(coachMember?.user.name).toBe("Coach Park");
  });

  it("updates a team name", async () => {
    const coach = await createUser({ name: "Coach Sato", phone: "+14155550206" });
    const team = await createTeam({ name: "Eagles", createdByUserId: coach.id });

    const updated = await updateTeam(team.id, { name: "Golden Eagles" });
    expect(updated?.name).toBe("Golden Eagles");

    const fetched = await getTeamById(team.id);
    expect(fetched?.name).toBe("Golden Eagles");
  });

  it("returns null when updating a nonexistent team", async () => {
    const updated = await updateTeam("00000000-0000-0000-0000-000000000000", { name: "Ghosts" });
    expect(updated).toBeNull();
  });

  it("gets membership for specific user/team", async () => {
    const coach = await createUser({ name: "Coach Rivera", phone: "+14155550205" });
    const team = await createTeam({ name: "Hawks", createdByUserId: coach.id });
    await addTeamMember({ teamId: team.id, userId: coach.id, role: "coach" });

    const membership = await getTeamMembership(team.id, coach.id);
    expect(membership?.role).toBe("coach");
  });
});
