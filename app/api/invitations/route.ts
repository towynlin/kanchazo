import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { createInvitation, invalidatePreviousInvitations } from "@/lib/db/queries/invitations";
import { getTeamMembership } from "@/lib/db/queries/teams";
import { createPlayer } from "@/lib/db/queries/players";
import { generateToken } from "@/lib/auth/tokens";
import { getSmsProvider } from "@/lib/sms";
import { getEmailProvider } from "@/lib/email";
import { canInviteParent, canInviteCoach } from "@/lib/domain/roles";
import { normalizePhone } from "@/lib/domain/phone";
import { INVITE_EXPIRY_DAYS } from "@/lib/domain/invites";

const schema = z.object({
  teamId: z.string().uuid().optional().nullable(),
  invitedRole: z.enum(["parent", "coach"]),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  playerNames: z.array(z.string().min(1)).optional(), // for parent invites
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
      if (data.invitedRole === "parent" && !canInviteParent(membership.role)) {
        return err("Only coaches can invite parents", 403);
      }
    }

    const phone = data.contactPhone ? normalizePhone(data.contactPhone) : null;
    if (data.contactPhone && !phone) return err("Invalid phone number", 400);

    // Pre-create players for parent invites
    let intendedPlayerIds: string[] = [];
    if (data.invitedRole === "parent" && data.teamId && data.playerNames?.length) {
      const created = await Promise.all(
        data.playerNames.map((name) => createPlayer({ teamId: data.teamId!, name })),
      );
      intendedPlayerIds = created.map((p) => p.id);
    }

    // Invalidate old pending invites for the same contact
    if (phone) await invalidatePreviousInvitations(phone, undefined, data.teamId ?? undefined);

    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation({
      teamId: data.teamId ?? null,
      inviterUserId: auth.user.id,
      invitedRole: data.invitedRole,
      contactPhone: phone,
      contactEmail: data.contactEmail ?? null,
      intendedPlayerIds: intendedPlayerIds.length ? intendedPlayerIds : null,
      tokenHash: hash,
      expiresAt,
    });

    // Send via SMS or email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    if (phone) {
      await getSmsProvider().sendInvite(phone, auth.user.name, inviteUrl);
    } else if (data.contactEmail) {
      await getEmailProvider().sendInvite(data.contactEmail, auth.user.name, inviteUrl);
    }

    return ok({ invitationId: invitation.id }, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
