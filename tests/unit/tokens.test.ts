import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "@/lib/auth/tokens";

describe("token utilities", () => {
  it("generates a token and its sha256 hash", () => {
    const { token, hash } = generateToken();
    expect(token).toBeTruthy();
    expect(hash).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
    expect(hash).toHaveLength(64); // sha256 hex = 64 chars
  });

  it("tokens are unique", () => {
    const { token: t1 } = generateToken();
    const { token: t2 } = generateToken();
    expect(t1).not.toBe(t2);
  });

  it("hashToken is deterministic", () => {
    const t = "test-token-value";
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it("hashToken matches the hash from generateToken", () => {
    const { token, hash } = generateToken();
    expect(hashToken(token)).toBe(hash);
  });

  it("hashToken produces different hashes for different inputs", () => {
    expect(hashToken("aaa")).not.toBe(hashToken("bbb"));
  });

  it("token is url-safe (base64url)", () => {
    const { token } = generateToken();
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");
    expect(token).not.toContain("=");
  });
});
