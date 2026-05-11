import { NextRequest } from "next/server";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok } from "@/lib/api/response";
import { getTeamMembers } from "@/lib/db/queries/teams";
import { getPlayersByGuardian } from "@/lib/db/queries/players";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const members = await getTeamMembers(teamId);

  // Attach players for each member
  const withPlayers = await Promise.all(
    members.map(async (m) => {
      const players = await getPlayersByGuardian(m.userId);
      const teamPlayers = players.filter((p) => p.teamId === teamId);
      return { ...m, players: teamPlayers };
    }),
  );

  return ok(withPlayers);
}
