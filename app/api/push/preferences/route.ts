import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { muteTeamPush, unmuteTeamPush } from "@/lib/db/queries/push-team-mutes";

const schema = z.object({
  teamId: z.string().uuid(),
  muted: z.boolean(),
});

// PUT /api/push/preferences — set per-team mute state
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { teamId, muted } = schema.parse(await req.json());
    if (muted) {
      await muteTeamPush(auth.user.id, teamId);
    } else {
      await unmuteTeamPush(auth.user.id, teamId);
    }
    return ok({ ok: true });
  } catch (e) {
    return handleZodError(e);
  }
}
