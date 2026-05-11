import { NextRequest } from "next/server";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok } from "@/lib/api/response";
import { getTeamEvents } from "@/lib/db/queries/events";
import { getTeamById } from "@/lib/db/queries/teams";
import { formatEventDate, formatEventTitle, formatEventTimeRange } from "@/lib/domain/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const includePast = req.nextUrl.searchParams.get("past") === "true";
  const [evts, team] = await Promise.all([
    getTeamEvents(teamId, { includePast }),
    getTeamById(teamId),
  ]);

  if (!team) return ok([]);

  const serialized = evts.map((e) => ({
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

  return ok(serialized);
}
