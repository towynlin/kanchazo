import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser, getTeamMembership } from "@/lib/db/queries/teams";
import { getTeamEvents } from "@/lib/db/queries/events";
import { getPlayersByGuardian } from "@/lib/db/queries/players";
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
  const events = await getTeamEvents(team.id);
  const myPlayers = await getPlayersByGuardian(auth.user.id);
  const teamPlayers = myPlayers.filter((p) => p.teamId === team.id);

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
      isCoach={membership?.role === "coach"}
      events={serializedEvents}
      myPlayers={teamPlayers.map((p) => ({ id: p.id, name: p.name }))}
      initialAvailability={availabilityByEvent}
    />
  );
}
