import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser, getTeamMembers, getTeamMembership } from "@/lib/db/queries/teams";
import { getPlayersByGuardian, getOrphanPlayers } from "@/lib/db/queries/players";
import RosterClient from "./RosterClient";
import { selectTeam } from "@/lib/api/selected-team";

export default async function RosterPage() {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const teams = await getTeamsByUser(auth.user.id);
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-gray-500">No teams yet.</p>
      </div>
    );
  }

  const team = (await selectTeam(teams))!;
  const [members, myMembership] = await Promise.all([
    getTeamMembers(team.id),
    getTeamMembership(team.id, auth.user.id),
  ]);
  const isCoach = myMembership?.role === "coach";

  const [membersWithPlayers, orphanPlayers] = await Promise.all([
    Promise.all(
      members.map(async (m) => {
        const allPlayers = await getPlayersByGuardian(m.userId);
        return { ...m, players: allPlayers.filter((p) => p.teamId === team.id) };
      }),
    ),
    isCoach ? getOrphanPlayers(team.id) : Promise.resolve([]),
  ]);

  function sortByName<T extends { user: { name: string } }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => a.user.name.localeCompare(b.user.name));
  }

  const coaches = sortByName(membersWithPlayers.filter((m) => m.role === "coach"));
  const parents = sortByName(membersWithPlayers.filter((m) => m.role === "parent"));

  return (
    <RosterClient
      teamId={team.id}
      isCoach={isCoach}
      currentUserId={auth.user.id}
      coaches={coaches}
      parents={parents}
      orphanPlayers={orphanPlayers}
    />
  );
}
