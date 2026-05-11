import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember, requireCoach } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { getEventById, updateEvent, deleteEvent } from "@/lib/db/queries/events";
import { writeAuditLog } from "@/lib/db/queries/audit-log";

const updateSchema = z.object({
  kind: z.enum(["game", "practice"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  location: z.string().min(1).optional(),
  opponentName: z.string().nullable().optional(),
  isHome: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["scheduled", "cancelled"]).optional(),
});

type Params = { teamId: string; eventId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { teamId, eventId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const event = await getEventById(eventId);
  if (!event || event.teamId !== teamId) return err("Not found", 404);
  return ok(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { teamId, eventId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const event = await getEventById(eventId);
    if (!event || event.teamId !== teamId) return err("Not found", 404);

    const updated = await updateEvent(eventId, {
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt !== undefined ? (data.endsAt ? new Date(data.endsAt) : null) : undefined,
      updatedByUserId: auth.user.id,
    });
    const action = data.status === "cancelled" ? "event.cancel" : "event.update";
    await writeAuditLog({
      actorUserId: auth.user.id,
      teamId,
      action,
      target: `event:${eventId}`,
      payload: data,
    });
    return ok(updated);
  } catch (e) {
    return handleZodError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { teamId, eventId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  const event = await getEventById(eventId);
  if (!event || event.teamId !== teamId) return err("Not found", 404);

  await deleteEvent(eventId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    teamId,
    action: "event.delete",
    target: `event:${eventId}`,
  });
  return ok({ deleted: true });
}
