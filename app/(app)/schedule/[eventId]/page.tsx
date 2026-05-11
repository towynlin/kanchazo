import { redirect, notFound } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser, getTeamMembership } from "@/lib/db/queries/teams";
import { getEventById } from "@/lib/db/queries/events";
import { getTeamPlayers, getPlayersByGuardian } from "@/lib/db/queries/players";
import { getEventAvailability } from "@/lib/db/queries/availability";
import {
  formatEventTitle,
  formatEventDate,
  formatEventTimeRange,
  isCancelledEvent,
} from "@/lib/domain/events";
import { availabilitySummary } from "@/lib/domain/availability";
import EventDetailClient from "./EventDetailClient";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const event = await getEventById(eventId);
  if (!event) notFound();

  const teams = await getTeamsByUser(auth.user.id);
  const team = teams.find((t) => t.id === event.teamId);
  if (!team) notFound();

  const membership = await getTeamMembership(team.id, auth.user.id);
  if (!membership) notFound();

  const isCoach = membership.role === "coach";
  const teamPlayers = await getTeamPlayers(team.id);
  const myPlayers = await getPlayersByGuardian(auth.user.id);
  const myTeamPlayerIds = new Set(myPlayers.filter((p) => p.teamId === team.id).map((p) => p.id));

  const availRows = await getEventAvailability(event.id);
  const availMap: Record<string, "yes" | "no" | "maybe"> = {};
  for (const a of availRows) {
    availMap[a.playerId] = a.status;
  }

  const statuses = availRows.map((a) => a.status);
  const summary = availabilitySummary(statuses, teamPlayers.length);

  return (
    <EventDetailClient
      event={{
        id: event.id,
        teamId: event.teamId,
        kind: event.kind,
        status: event.status,
        location: event.location,
        opponentName: event.opponentName,
        isHome: event.isHome,
        notes: event.notes,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        title: formatEventTitle(event),
        dateLabel: formatEventDate(event.startsAt, team.timeZone),
        timeLabel: formatEventTimeRange(event.startsAt, event.endsAt, team.timeZone),
        isCancelled: isCancelledEvent(event),
      }}
      isCoach={isCoach}
      players={teamPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        isMyPlayer: myTeamPlayerIds.has(p.id),
      }))}
      availability={availMap}
      summary={summary}
    />
  );
}
