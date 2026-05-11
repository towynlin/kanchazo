import { NextRequest, NextResponse } from "next/server";
import { findUserByIcalToken } from "@/lib/db/queries/ical-tokens";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import { getTeamEvents } from "@/lib/db/queries/events";
import { findUserById } from "@/lib/db/queries/users";
import { generateIcal } from "@/lib/ical/generate";
import type { Team } from "@/lib/db/schema";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const userId = await findUserByIcalToken(token);
  if (!userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [user, teams] = await Promise.all([findUserById(userId), getTeamsByUser(userId)]);
  if (!user) return new NextResponse("Not found", { status: 404 });

  // Fetch all events for all teams
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const allEvents = (
    await Promise.all(teams.map((t) => getTeamEvents(t.id, { includePast: true })))
  ).flat();

  const calName = `${user.name}'s Teams`;
  const ical = generateIcal(allEvents, teamMap, calName);

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="kanchazo.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
