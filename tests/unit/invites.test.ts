import { describe, it, expect } from "vitest";
import { isExpiredInvite, isUsedInvite, canAcceptInvite } from "@/lib/domain/invites";

const future = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
const past = new Date(Date.now() - 1000 * 60); // 1 minute ago

describe("isExpiredInvite", () => {
  it("not expired when expiresAt is in future", () => {
    expect(isExpiredInvite({ expiresAt: future })).toBe(false);
  });

  it("expired when expiresAt is in past", () => {
    expect(isExpiredInvite({ expiresAt: past })).toBe(true);
  });
});

describe("isUsedInvite", () => {
  it("not used when usedAt is null", () => {
    expect(isUsedInvite({ usedAt: null })).toBe(false);
  });

  it("used when usedAt is set", () => {
    expect(isUsedInvite({ usedAt: new Date() })).toBe(true);
  });
});

describe("canAcceptInvite", () => {
  it("can accept when valid and unused", () => {
    expect(canAcceptInvite({ expiresAt: future, usedAt: null })).toBe(true);
  });

  it("cannot accept when expired", () => {
    expect(canAcceptInvite({ expiresAt: past, usedAt: null })).toBe(false);
  });

  it("cannot accept when already used", () => {
    expect(canAcceptInvite({ expiresAt: future, usedAt: new Date() })).toBe(false);
  });

  it("cannot accept when expired and used", () => {
    expect(canAcceptInvite({ expiresAt: past, usedAt: new Date() })).toBe(false);
  });
});
