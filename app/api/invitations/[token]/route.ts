import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { findInvitationByTokenHash, consumeInvitation } from "@/lib/db/queries/invitations";
import { getTeamById, addTeamMember } from "@/lib/db/queries/teams";
import { findUserByPhone, createUser } from "@/lib/db/queries/users";
import { addGuardian } from "@/lib/db/queries/players";
import { createSessionForUser } from "@/lib/auth/magic-link";
import { makeSessionCookieHeader } from "@/lib/auth/session";
import { canAcceptInvite } from "@/lib/domain/invites";
import { hashToken } from "@/lib/auth/tokens";
import { normalizePhone } from "@/lib/domain/phone";

const acceptSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hash = hashToken(token);
  const invitation = await findInvitationByTokenHash(hash);

  if (!invitation) return err("Invitation not found", 404);
  if (!canAcceptInvite({ expiresAt: invitation.expiresAt, usedAt: invitation.usedAt })) {
    return err("Invitation has expired or already been used", 410);
  }

  const team = invitation.teamId ? await getTeamById(invitation.teamId) : null;
  return ok({
    invitedRole: invitation.invitedRole,
    team: team ? { id: team.id, name: team.name } : null,
    contactPhone: invitation.contactPhone,
    contactEmail: invitation.contactEmail,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hash = hashToken(token);
  const invitation = await findInvitationByTokenHash(hash);

  if (!invitation) return err("Invitation not found", 404);
  if (!canAcceptInvite({ expiresAt: invitation.expiresAt, usedAt: invitation.usedAt })) {
    return err("Invitation has expired or already been used", 410);
  }

  try {
    const body = await req.json();
    const { name, email, phone: rawPhone } = acceptSchema.parse(body);

    const phone = rawPhone ? normalizePhone(rawPhone) : invitation.contactPhone;
    if (!phone) return err("Phone number required", 400);

    // Find or create the user
    let user = await findUserByPhone(phone);
    if (!user) {
      if (!name) return err("Name required for new users", 400);
      user = await createUser({ name, email: email ?? null, phone });
    }

    await consumeInvitation(invitation.id, user.id);

    // Add to team
    if (invitation.teamId) {
      await addTeamMember({
        teamId: invitation.teamId,
        userId: user.id,
        role: invitation.invitedRole,
      });

      // Link to pre-created players for parent invites
      if (invitation.invitedRole === "parent" && invitation.intendedPlayerIds) {
        for (const playerId of invitation.intendedPlayerIds) {
          await addGuardian(playerId, user.id);
        }
      }
    }

    const { rawSessionToken } = await createSessionForUser(user.id);
    const response = ok({ userId: user.id, teamId: invitation.teamId });
    response.headers.set("Set-Cookie", makeSessionCookieHeader(rawSessionToken));
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}
