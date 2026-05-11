import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { setAvailability } from "@/lib/db/queries/availability";
import { getPlayerById } from "@/lib/db/queries/players";
import { getPlayersByGuardian } from "@/lib/db/queries/players";

const schema = z.object({
  playerId: z.string().uuid(),
  status: z.enum(["yes", "no", "maybe"]),
});

type Params = { teamId: string; eventId: string };

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { teamId, eventId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { playerId, status } = schema.parse(body);

    // Verify the player belongs to this team
    const player = await getPlayerById(playerId);
    if (!player || player.teamId !== teamId) return err("Player not found", 404);

    // Parents can only update their own players; coaches can update any player
    if (auth.role === "parent") {
      const myPlayers = await getPlayersByGuardian(auth.user.id);
      const isMyPlayer = myPlayers.some((p) => p.id === playerId);
      if (!isMyPlayer) return err("Forbidden", 403);
    }

    const avail = await setAvailability({
      eventId,
      playerId,
      status,
      updatedByUserId: auth.user.id,
    });
    return ok(avail);
  } catch (e) {
    return handleZodError(e);
  }
}
