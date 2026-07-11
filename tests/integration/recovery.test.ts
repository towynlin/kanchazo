import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import {
  issueRecoveryCodes,
  redeemRecoveryCode,
  issueRecoveryLink,
  peekRecoveryLink,
  redeemRecoveryLink,
} from "@/lib/auth/recovery";
import { countUnusedRecoveryCodes } from "@/lib/db/queries/recovery-codes";
import { findValidRecoveryLink } from "@/lib/db/queries/recovery-links";
import { findSessionByTokenHash } from "@/lib/db/queries/sessions";
import { hashToken } from "@/lib/auth/tokens";
import { RECOVERY_CODE_COUNT } from "@/lib/domain/recovery-codes";

describe("recovery codes", () => {
  it("issues a full set of distinct codes", async () => {
    const user = await createUser({ name: "Codes Carla" });
    const codes = await issueRecoveryCodes(user.id);

    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
    expect(await countUnusedRecoveryCodes(user.id)).toBe(RECOVERY_CODE_COUNT);
  });

  it("redeems a code once, creating a session, and burns it", async () => {
    const user = await createUser({ name: "Redeem Rita" });
    const codes = await issueRecoveryCodes(user.id);

    const result = await redeemRecoveryCode(codes[0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(user.id);
      const session = await findSessionByTokenHash(hashToken(result.rawSessionToken));
      expect(session?.userId).toBe(user.id);
    }
    expect(await countUnusedRecoveryCodes(user.id)).toBe(RECOVERY_CODE_COUNT - 1);

    // Second redemption of the same code fails
    const again = await redeemRecoveryCode(codes[0]);
    expect(again.ok).toBe(false);
  });

  it("accepts sloppy input (lowercase, missing dash, spaces)", async () => {
    const user = await createUser({ name: "Sloppy Sam" });
    const codes = await issueRecoveryCodes(user.id);

    const sloppy = ` ${codes[1].toLowerCase().replace("-", " ")} `;
    const result = await redeemRecoveryCode(sloppy);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown and malformed codes", async () => {
    expect((await redeemRecoveryCode("AAAAA-AAAAA")).ok).toBe(false);
    expect((await redeemRecoveryCode("nope")).ok).toBe(false);
    expect((await redeemRecoveryCode("")).ok).toBe(false);
  });

  it("regenerating codes invalidates the previous set", async () => {
    const user = await createUser({ name: "Regen Ray" });
    const oldCodes = await issueRecoveryCodes(user.id);
    await issueRecoveryCodes(user.id);

    expect(await countUnusedRecoveryCodes(user.id)).toBe(RECOVERY_CODE_COUNT);
    expect((await redeemRecoveryCode(oldCodes[0])).ok).toBe(false);
  });
});

describe("recovery links", () => {
  function tokenFromUrl(url: string): string {
    return url.split("/recover/")[1];
  }

  it("issues a link that can be peeked without consuming", async () => {
    const user = await createUser({ name: "Peek Paula" });
    const coach = await createUser({ name: "Coach Kim" });
    const { url, expiresAt } = await issueRecoveryLink(user.id, coach.id);

    expect(url).toContain("/recover/");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const token = tokenFromUrl(url);
    expect(await peekRecoveryLink(token)).toEqual({ userName: "Peek Paula" });
    // Peeking does not consume
    expect(await findValidRecoveryLink(hashToken(token))).not.toBeNull();
  });

  it("redeems a link once, creating a session for the target user", async () => {
    const user = await createUser({ name: "Locked-out Lou" });
    const { url } = await issueRecoveryLink(user.id, null); // sysadmin-issued
    const token = tokenFromUrl(url);

    const result = await redeemRecoveryLink(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(user.id);
      const session = await findSessionByTokenHash(hashToken(result.rawSessionToken));
      expect(session?.userId).toBe(user.id);
    }

    // Single use
    expect((await redeemRecoveryLink(token)).ok).toBe(false);
    expect(await peekRecoveryLink(token)).toBeNull();
  });

  it("rejects unknown tokens", async () => {
    expect(await peekRecoveryLink("bogus")).toBeNull();
    expect((await redeemRecoveryLink("bogus")).ok).toBe(false);
  });
});
