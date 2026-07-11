import { NextRequest } from "next/server";
import { requireCoach } from "@/lib/api/require-auth";
import { ok, err } from "@/lib/api/response";
import { getTeamMembership } from "@/lib/db/queries/teams";
import { issueRecoveryLink } from "@/lib/auth/recovery";
import { writeAuditLog } from "@/lib/db/queries/audit-log";

type Params = { teamId: string; userId: string };

// Coach generates a single-use sign-in link for a team member (parent or fellow coach)
// who lost access to their passkey, to share over any side channel.
export async function POST(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { teamId, userId } = await params;
  const auth = await requireCoach(teamId);
  if (!auth.ok) return auth.response;

  const membership = await getTeamMembership(teamId, userId);
  if (!membership) return err("Member not found", 404);

  const { url, expiresAt } = await issueRecoveryLink(userId, auth.user.id);
  await writeAuditLog({
    actorUserId: auth.user.id,
    teamId,
    action: "member.recovery_link",
    target: `user:${userId}`,
  });

  return ok({ url, expiresAt: expiresAt.toISOString() }, 201);
}
