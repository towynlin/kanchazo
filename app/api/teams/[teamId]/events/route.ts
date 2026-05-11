import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember, requireCoach } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { createEvent, getTeamEvents } from "@/lib/db/queries/events";

const createSchema = z.object({
  kind: z.enum(["game", "practice"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  location: z.string().min(1),
  opponentName: z.string().optional().nullable(),
  isHome: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const events = await getTeamEvents(teamId);
  return ok(events);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
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
    return ok(event, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
