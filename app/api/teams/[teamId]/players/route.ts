import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember, requireCoach } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { getTeamPlayers, createPlayer } from "@/lib/db/queries/players";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const players = await getTeamPlayers(teamId);
  return ok(players);
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
    const { name } = createSchema.parse(body);
    const player = await createPlayer({ teamId, name });
    return ok(player, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
