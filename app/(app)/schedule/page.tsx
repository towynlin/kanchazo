import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser, getTeamMembership } from "@/lib/db/queries/teams";
import { getTeamEvents } from "@/lib/db/queries/events";
import { getPlayersByGuardian, getTeamPlayers } from "@/lib/db/queries/players";
import { getEventAvailability } from "@/lib/db/queries/availability";
import { formatEventDate, formatEventTitle, formatEventTimeRange } from "@/lib/domain/events";
import ScheduleClient from "./ScheduleClient";
import NoTeamState from "@/components/NoTeamState";
import { selectTeam } from "@/lib/api/selected-team";

export default async function SchedulePage() {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const teams = await getTeamsByUser(auth.user.id);
  if (teams.length === 0) {
    return <NoTeamState canCreateTeam />;
  }

  const team = (await selectTeam(teams))!;
  const membership = await getTeamMembership(team.id, auth.user.id);
  const isCoach = membership?.role === "coach";
  const events = await getTeamEvents(team.id);
  const myPlayers = await getPlayersByGuardian(auth.user.id);
  const teamPlayers = myPlayers.filter((p) => p.teamId === team.id);
  const myPlayerIds = new Set(teamPlayers.map((p) => p.id));

  // Coaches manage the whole roster; parents manage only their own players.
  const rosterPlayers = isCoach ? await getTeamPlayers(team.id) : teamPlayers;

  // Fetch availability for all events for my players
  const availabilityByEvent: Record<string, Record<string, "yes" | "no" | "maybe">> = {};
  for (const event of events) {
    const avail = await getEventAvailability(event.id);
    availabilityByEvent[event.id] = {};
    for (const a of avail) {
      availabilityByEvent[event.id][a.playerId] = a.status;
    }
  }

  const serializedEvents = events.map((e) => ({
    id: e.id,
    kind: e.kind,
    status: e.status,
    location: e.location,
    opponentName: e.opponentName,
    isHome: e.isHome,
    notes: e.notes,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    title: formatEventTitle(e),
    dateLabel: formatEventDate(e.startsAt, team.timeZone),
    timeLabel: formatEventTimeRange(e.startsAt, e.endsAt, team.timeZone),
  }));

  return (
    <ScheduleClient
      teamId={team.id}
      timeZone={team.timeZone}
      isCoach={isCoach}
      events={serializedEvents}
      players={rosterPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        isMyPlayer: myPlayerIds.has(p.id),
      }))}
      initialAvailability={availabilityByEvent}
    />
  );
}
