import { NextRequest } from "next/server";
import { requireCoach } from "@/lib/api/require-auth";
import { ok, err } from "@/lib/api/response";
import { removeTeamMember, getTeamMembership } from "@/lib/db/queries/teams";
import { writeAuditLog } from "@/lib/db/queries/audit-log";

type Params = { teamId: string; userId: string };

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { teamId, userId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  // Prevent self-removal
  if (userId === auth.user.id) return err("Cannot remove yourself", 400);

  const membership = await getTeamMembership(teamId, userId);
  if (!membership) return err("Member not found", 404);

  await removeTeamMember(teamId, userId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    teamId,
    action: "member.remove",
    target: `user:${userId}`,
  });

  return ok({ removed: true });
}
