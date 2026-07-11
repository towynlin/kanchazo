import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { updateTeam } from "@/lib/db/queries/teams";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  try {
    const { name } = updateSchema.parse(await req.json());
    const team = await updateTeam(teamId, { name });
    if (!team) return err("Team not found", 404);
    return ok(team);
  } catch (e) {
    return handleZodError(e);
  }
}
