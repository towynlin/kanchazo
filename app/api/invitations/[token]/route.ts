import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { findInvitationByTokenHash, consumeInvitation } from "@/lib/db/queries/invitations";
import { getTeamById, addTeamMember, getTeamMembership } from "@/lib/db/queries/teams";
import { createUser } from "@/lib/db/queries/users";
import { addGuardian } from "@/lib/db/queries/players";
import {
  getSessionAndUser,
  createSessionForUser,
  makeSessionCookieHeader,
} from "@/lib/auth/session";
import { canAcceptInvite } from "@/lib/domain/invites";
import { hashToken } from "@/lib/auth/tokens";
import { normalizePhone } from "@/lib/domain/phone";

const acceptSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hash = hashToken(token);
  const invitation = await findInvitationByTokenHash(hash);

  if (!invitation) return err("Invitation not found", 404);
  if (!canAcceptInvite({ expiresAt: invitation.expiresAt, usedAt: invitation.usedAt })) {
    return err("Invitation has expired or already been used", 410);
  }

  const [team, session] = await Promise.all([
    invitation.teamId ? getTeamById(invitation.teamId) : null,
    getSessionAndUser(),
  ]);
  return ok({
    invitedRole: invitation.invitedRole,
    team: team ? { id: team.id, name: team.name } : null,
    contactEmail: invitation.contactEmail,
    signedInAs: session ? { name: session.user.name } : null,
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

    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return err("Invalid phone number", 400);

    // Signed-in visitors join with their existing account; otherwise create a new one.
    // (There is no phone/email dedupe — contact info is unverified and must never
    // grant access to someone else's account.)
    const existingSession = await getSessionAndUser();
    let user = existingSession?.user ?? null;
    let isNewUser = false;
    if (!user) {
      if (!name) return err("Name required", 400);
      user = await createUser({ name, email: email ?? invitation.contactEmail, phone });
      isNewUser = true;
    }

    await consumeInvitation(invitation.id, user.id);

    // Add to team
    if (invitation.teamId) {
      const alreadyMember = await getTeamMembership(invitation.teamId, user.id);
      if (!alreadyMember) {
        await addTeamMember({
          teamId: invitation.teamId,
          userId: user.id,
          role: invitation.invitedRole,
        });
      }

      // Link to pre-created players for parent invites
      if (invitation.invitedRole === "parent" && invitation.intendedPlayerIds) {
        for (const playerId of invitation.intendedPlayerIds) {
          await addGuardian(playerId, user.id);
        }
      }
    }

    const response = ok({ userId: user.id, teamId: invitation.teamId, isNewUser });
    if (!existingSession) {
      const { rawSessionToken } = await createSessionForUser(user.id);
      response.headers.set("Set-Cookie", makeSessionCookieHeader(rawSessionToken));
    }
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}
