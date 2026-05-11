import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser, getTeamMembers } from "@/lib/db/queries/teams";
import { getPlayersByGuardian } from "@/lib/db/queries/players";

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

  const team = teams[0];
  const members = await getTeamMembers(team.id);

  // Add players for each member
  const membersWithPlayers = await Promise.all(
    members.map(async (m) => {
      const allPlayers = await getPlayersByGuardian(m.userId);
      return { ...m, players: allPlayers.filter((p) => p.teamId === team.id) };
    }),
  );

  const coaches = membersWithPlayers.filter((m) => m.role === "coach");
  const parents = membersWithPlayers.filter((m) => m.role === "parent");

  function sortByName<T extends { user: { name: string } }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => a.user.name.localeCompare(b.user.name));
  }

  return (
    <div className="pb-4">
      {/* Coaches section */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Coaches ({coaches.length})
        </h2>
      </div>
      {sortByName(coaches).map((m) => (
        <MemberRow key={m.userId} member={m} />
      ))}

      {/* Parents section */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 mt-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Parents & Guardians ({parents.length})
        </h2>
      </div>
      {sortByName(parents).map((m) => (
        <MemberRow key={m.userId} member={m} />
      ))}
    </div>
  );
}

function MemberRow({
  member,
}: {
  member: {
    userId: string;
    user: { name: string; email: string | null; phone: string };
    players: { id: string; name: string }[];
  };
}) {
  const { user, players } = member;
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="font-medium text-gray-900">{user.name}</div>

      {user.email && (
        <a
          href={`mailto:${user.email}`}
          className="text-sm text-blue-600 mt-0.5 block min-h-0"
          style={{ minHeight: "auto" }}
        >
          {user.email}
        </a>
      )}

      <a
        href={`tel:${user.phone}`}
        className="text-sm text-blue-600 mt-0.5 block min-h-0"
        style={{ minHeight: "auto" }}
      >
        {user.phone}
      </a>

      {players.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {players.map((p) => (
            <span
              key={p.id}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
