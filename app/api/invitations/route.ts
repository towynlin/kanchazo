import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { createInvitation } from "@/lib/db/queries/invitations";
import { getTeamMembership } from "@/lib/db/queries/teams";
import { createPlayer, getTeamPlayers, getPlayersByGuardian } from "@/lib/db/queries/players";
import { generateToken } from "@/lib/auth/tokens";
import { getEmailProvider } from "@/lib/email";
import { canInviteParent, canInviteCoach, canInviteCoGuardian } from "@/lib/domain/roles";
import { INVITE_EXPIRY_DAYS } from "@/lib/domain/invites";

const schema = z.object({
  teamId: z.string().uuid().optional().nullable(),
  invitedRole: z.enum(["parent", "coach"]),
  contactEmail: z.string().email().optional().nullable(),
  playerNames: z.array(z.string().min(1)).optional(), // coach inviting parent: pre-create players
  intendedPlayerIds: z.array(z.string().uuid()).optional(), // parent sharing co-guardian access
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Permission check
    if (data.teamId) {
      const membership = await getTeamMembership(data.teamId, auth.user.id);
      if (!membership) return err("Not a team member", 403);

      if (data.invitedRole === "coach" && !canInviteCoach(membership.role)) {
        return err("Only coaches can invite coaches", 403);
      }
      if (data.invitedRole === "parent") {
        const isCoGuardianInvite = !!(data.intendedPlayerIds?.length && !data.playerNames?.length);
        if (isCoGuardianInvite) {
          const teamPlayerIds = new Set((await getTeamPlayers(data.teamId)).map((p) => p.id));
          if (!data.intendedPlayerIds!.every((id) => teamPlayerIds.has(id))) {
            return err("Unknown player", 400);
          }
          const myPlayerIds = new Set((await getPlayersByGuardian(auth.user.id)).map((p) => p.id));
          const isGuardianOfAll = data.intendedPlayerIds!.every((id) => myPlayerIds.has(id));
          if (!canInviteCoGuardian(membership.role, isGuardianOfAll)) {
            return err("You can only invite co-guardians for your own players", 403);
          }
        } else if (!canInviteParent(membership.role)) {
          return err("Only coaches can invite new parents", 403);
        }
      }
    }

    // Pre-create players for coach→parent invites (playerNames provided)
    let intendedPlayerIds: string[] = data.intendedPlayerIds ?? [];
    if (data.invitedRole === "parent" && data.teamId && data.playerNames?.length) {
      const created = await Promise.all(
        data.playerNames.map((name) => createPlayer({ teamId: data.teamId!, name })),
      );
      intendedPlayerIds = created.map((p) => p.id);
    }

    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation({
      teamId: data.teamId ?? null,
      inviterUserId: auth.user.id,
      invitedRole: data.invitedRole,
      contactPhone: null,
      contactEmail: data.contactEmail ?? null,
      intendedPlayerIds: intendedPlayerIds.length ? intendedPlayerIds : null,
      tokenHash: hash,
      expiresAt,
    });

    // The inviter shares the link over any channel (text, WhatsApp, in person);
    // optionally we also email it for them.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    if (data.contactEmail) {
      await getEmailProvider().sendInvite(data.contactEmail, auth.user.name, inviteUrl);
    }

    return ok({ invitationId: invitation.id, url: inviteUrl }, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
