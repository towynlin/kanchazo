import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam } from "@/lib/db/queries/teams";
import {
  createInvitation,
  findInvitationByTokenHash,
  consumeInvitation,
} from "@/lib/db/queries/invitations";
import { generateToken } from "@/lib/auth/tokens";
import { INVITE_EXPIRY_DAYS } from "@/lib/domain/invites";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

function futureDate(days = INVITE_EXPIRY_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("invitations queries", () => {
  it("creates and finds an invitation by token hash", async () => {
    const coach = await createUser({ name: "Coach", phone: rando() });
    const team = await createTeam({ name: "Invite Team", createdByUserId: coach.id });
    const { hash } = generateToken();

    const invitation = await createInvitation({
      teamId: team.id,
      inviterUserId: coach.id,
      invitedRole: "parent",
      contactPhone: rando(),
      contactEmail: null,
      intendedPlayerIds: null,
      tokenHash: hash,
      expiresAt: futureDate(),
    });

    expect(invitation.id).toBeTruthy();
    expect(invitation.invitedRole).toBe("parent");
    expect(invitation.usedAt).toBeNull();

    const found = await findInvitationByTokenHash(hash);
    expect(found?.id).toBe(invitation.id);
    expect(found?.teamId).toBe(team.id);
  });

  it("returns null for unknown token hash", async () => {
    const found = await findInvitationByTokenHash("nonexistentHash");
    expect(found).toBeNull();
  });

  it("consumes an invitation", async () => {
    const coach = await createUser({ name: "Coach2", phone: rando() });
    const parent = await createUser({ name: "Parent", phone: rando() });
    const team = await createTeam({ name: "Consume Team", createdByUserId: coach.id });
    const { hash } = generateToken();

    const invitation = await createInvitation({
      teamId: team.id,
      inviterUserId: coach.id,
      invitedRole: "parent",
      contactPhone: null,
      contactEmail: null,
      intendedPlayerIds: null,
      tokenHash: hash,
      expiresAt: futureDate(),
    });

    await consumeInvitation(invitation.id, parent.id);
    const found = await findInvitationByTokenHash(hash);
    expect(found?.usedAt).not.toBeNull();
    expect(found?.usedByUserId).toBe(parent.id);
  });

  it("stores intendedPlayerIds as array", async () => {
    const coach = await createUser({ name: "Coach3", phone: rando() });
    const team = await createTeam({ name: "Array Team", createdByUserId: coach.id });
    const { hash } = generateToken();
    const fakeIds = [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
    ];

    await createInvitation({
      teamId: team.id,
      inviterUserId: coach.id,
      invitedRole: "parent",
      contactPhone: null,
      contactEmail: null,
      intendedPlayerIds: fakeIds,
      tokenHash: hash,
      expiresAt: futureDate(),
    });

    const found = await findInvitationByTokenHash(hash);
    expect(found?.intendedPlayerIds).toEqual(fakeIds);
  });

  it("creates system-admin invitation with null teamId", async () => {
    const { hash } = generateToken();
    const phone = rando();

    const invitation = await createInvitation({
      teamId: null,
      inviterUserId: null,
      invitedRole: "coach",
      contactPhone: phone,
      contactEmail: null,
      intendedPlayerIds: null,
      tokenHash: hash,
      expiresAt: futureDate(),
    });

    expect(invitation.teamId).toBeNull();
    expect(invitation.inviterUserId).toBeNull();
    expect(invitation.contactPhone).toBe(phone);
  });
});
