import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { getEventById } from "@/lib/db/queries/events";
import { getGameReportByEvent, saveGameReport } from "@/lib/db/queries/game-reports";
import { writeAuditLog } from "@/lib/db/queries/audit-log";

const saveSchema = z.object({
  ourScore: z.number().int().min(0).max(999).nullable(),
  opponentScore: z.number().int().min(0).max(999).nullable(),
  coachNotes: z.string().max(10000).nullable(),
  // Version the client's edit was based on; 0 = no report existed yet.
  baseVersion: z.number().int().min(0),
});

type Params = { teamId: string; eventId: string };

async function requireGameEvent(teamId: string, eventId: string) {
  const event = await getEventById(eventId);
  if (!event || event.teamId !== teamId) return err("Not found", 404);
  if (event.kind !== "game") return err("Not a game", 400);
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { teamId, eventId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  const invalid = await requireGameEvent(teamId, eventId);
  if (invalid) return invalid;

  return ok(await getGameReportByEvent(eventId));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { teamId, eventId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { baseVersion, ...data } = saveSchema.parse(body);

    const invalid = await requireGameEvent(teamId, eventId);
    if (invalid) return invalid;

    const result = await saveGameReport(eventId, data, baseVersion, auth.user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Another coach saved changes to this report", current: result.current },
        { status: 409 },
      );
    }

    await writeAuditLog({
      actorUserId: auth.user.id,
      teamId,
      action: "event.game_report.save",
      target: `event:${eventId}`,
      payload: data,
    });
    return ok(result.report);
  } catch (e) {
    return handleZodError(e);
  }
}
