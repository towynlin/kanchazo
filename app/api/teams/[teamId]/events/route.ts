import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember, requireCoach } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { createEvent, getTeamEvents } from "@/lib/db/queries/events";
import { writeAuditLog } from "@/lib/db/queries/audit-log";
import { getTeamMembers } from "@/lib/db/queries/teams";
import { getNonMutedSubscriptions } from "@/lib/db/queries/push-team-mutes";
import { sendPushToUsers } from "@/lib/push/send";

const createSchema = z.object({
  kind: z.enum(["game", "practice"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  location: z.string().min(1),
  opponentName: z.string().optional().nullable(),
  isHome: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const includePast = req.nextUrl.searchParams.get("past") === "true";
  const evts = await getTeamEvents(teamId, { includePast });
  return ok(evts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const event = await createEvent({
      teamId,
      kind: data.kind,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      location: data.location,
      opponentName: data.opponentName ?? null,
      isHome: data.isHome ?? null,
      notes: data.notes ?? null,
      createdByUserId: auth.user.id,
    });
    await writeAuditLog({
      actorUserId: auth.user.id,
      teamId,
      action: "event.create",
      target: `event:${event.id}`,
      payload: { kind: event.kind, startsAt: event.startsAt },
    });

    const members = await getTeamMembers(teamId);
    const otherUserIds = members.map((m) => m.userId).filter((id) => id !== auth.user.id);
    if (otherUserIds.length > 0) {
      getNonMutedSubscriptions(otherUserIds, teamId)
        .then((subs) => {
          if (subs.length > 0) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            const label = event.kind === "game" ? "Game" : "Practice";
            sendPushToUsers(subs, {
              title: `New ${label} added`,
              body: `${event.location} · ${new Date(event.startsAt).toLocaleDateString()}`,
              url: `${appUrl}/schedule/${event.id}`,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return ok(event, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
