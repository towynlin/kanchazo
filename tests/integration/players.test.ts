import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam } from "@/lib/db/queries/teams";
import {
  createPlayer,
  getTeamPlayers,
  getPlayersByGuardian,
  addGuardian,
} from "@/lib/db/queries/players";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

describe("players queries", () => {
  it("creates and lists players for a team", async () => {
    const coach = await createUser({ name: "Coach", phone: rando() });
    const team = await createTeam({ name: "Tigers", createdByUserId: coach.id });

    const p1 = await createPlayer({ teamId: team.id, name: "Alice" });
    const p2 = await createPlayer({ teamId: team.id, name: "Bob" });

    const players = await getTeamPlayers(team.id);
    expect(players).toHaveLength(2);
    expect(players.map((p) => p.name)).toContain("Alice");
    expect(players.map((p) => p.name)).toContain("Bob");
    expect(p1.teamId).toBe(team.id);
    expect(p2.id).toBeTruthy();
  });

  it("adds a guardian and retrieves players by guardian", async () => {
    const coach = await createUser({ name: "Coach", phone: rando() });
    const parent = await createUser({ name: "Parent", phone: rando() });
    const team = await createTeam({ name: "Lions", createdByUserId: coach.id });

    const player = await createPlayer({ teamId: team.id, name: "Charlie" });
    await addGuardian(player.id, parent.id);

    const playersByGuardian = await getPlayersByGuardian(parent.id);
    expect(playersByGuardian).toHaveLength(1);
    expect(playersByGuardian[0].id).toBe(player.id);
    expect(playersByGuardian[0].name).toBe("Charlie");
  });

  it("returns empty list for user with no players", async () => {
    const user = await createUser({ name: "Nobody", phone: rando() });
    const players = await getPlayersByGuardian(user.id);
    expect(players).toHaveLength(0);
  });

  it("does not return players from other teams", async () => {
    const coach = await createUser({ name: "Coach", phone: rando() });
    const team1 = await createTeam({ name: "Team 1", createdByUserId: coach.id });
    const team2 = await createTeam({ name: "Team 2", createdByUserId: coach.id });

    await createPlayer({ teamId: team1.id, name: "Player A" });
    await createPlayer({ teamId: team2.id, name: "Player B" });

    const t1Players = await getTeamPlayers(team1.id);
    expect(t1Players).toHaveLength(1);
    expect(t1Players[0].name).toBe("Player A");
  });
});
