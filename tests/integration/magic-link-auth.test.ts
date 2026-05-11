import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createInvitation } from "@/lib/db/queries/invitations";
import { sendMagicLink, verifyMagicLink, createSessionForUser } from "@/lib/auth/magic-link";
import { LoggerSmsProvider } from "@/lib/sms/logger";
import { findSessionByTokenHash } from "@/lib/db/queries/sessions";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { INVITE_EXPIRY_DAYS } from "@/lib/domain/invites";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function createInviteForPhone(phone: string) {
  const { hash } = generateToken();
  await createInvitation({
    teamId: null,
    inviterUserId: null,
    invitedRole: "coach",
    contactPhone: phone,
    contactEmail: null,
    intendedPlayerIds: null,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 86400 * 1000),
  });
}

describe("magic link auth flow", () => {
  it("sends a magic link and captures it in the logger provider", async () => {
    const phone = rando();
    await createInviteForPhone(phone);
    const sms = new LoggerSmsProvider();

    const result = await sendMagicLink(phone, sms);
    expect(result.ok).toBe(true);
    expect(sms.outbox).toHaveLength(1);
    expect(sms.outbox[0].to).toBe(phone);
    expect(sms.outbox[0].type).toBe("magic-link");
    expect(sms.outbox[0].url).toContain("/auth/verify?t=");
  });

  it("verifies a magic link and returns isNewUser=true for unknown phone", async () => {
    const phone = rando();
    await createInviteForPhone(phone);
    const sms = new LoggerSmsProvider();

    await sendMagicLink(phone, sms);
    const url = sms.outbox[0].url;
    const token = new URL(url).searchParams.get("t")!;

    const result = await verifyMagicLink(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.isNewUser).toBe(true);
      expect(result.phone).toBe(phone);
      expect(result.session).toBeNull();
    }
  });

  it("verifies a magic link and creates a session for an existing user", async () => {
    const phone = rando();
    await createUser({ name: "Existing User", phone });

    const sms = new LoggerSmsProvider();
    await sendMagicLink(phone, sms);
    const url = sms.outbox[0].url;
    const token = new URL(url).searchParams.get("t")!;

    const result = await verifyMagicLink(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.isNewUser).toBe(false);
      expect(result.session).not.toBeNull();
      expect(result.rawSessionToken).toBeTruthy();
    }
  });

  it("rejects a used magic link", async () => {
    const phone = rando();
    await createInviteForPhone(phone);
    const sms = new LoggerSmsProvider();

    await sendMagicLink(phone, sms);
    const url = sms.outbox[0].url;
    const token = new URL(url).searchParams.get("t")!;

    // Use it once
    await verifyMagicLink(token);
    // Try again — should fail
    const result2 = await verifyMagicLink(token);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error).toContain("Invalid or expired");
    }
  });

  it("rejects unknown phone with no invitation", async () => {
    const phone = rando();
    const sms = new LoggerSmsProvider();
    const result = await sendMagicLink(phone, sms);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("createSessionForUser generates a valid session", async () => {
    const user = await createUser({ name: "Session User", phone: rando() });
    const { rawSessionToken, session } = await createSessionForUser(user.id);

    expect(rawSessionToken).toBeTruthy();
    expect(session.userId).toBe(user.id);

    // Verify it's findable by hashing the raw token
    const hash = hashToken(rawSessionToken);
    const found = await findSessionByTokenHash(hash);
    expect(found?.id).toBe(session.id);
  });
});
