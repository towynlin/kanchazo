import { describe, it, expect } from "vitest";
import { normalizePhone, isValidE164 } from "@/lib/domain/phone";

describe("normalizePhone", () => {
  it("normalizes 10-digit US number", () => {
    expect(normalizePhone("4155550123")).toBe("+14155550123");
  });

  it("normalizes US number with formatting", () => {
    expect(normalizePhone("(415) 555-0123")).toBe("+14155550123");
  });

  it("normalizes US number with dashes", () => {
    expect(normalizePhone("415-555-0123")).toBe("+14155550123");
  });

  it("passes through valid E.164", () => {
    expect(normalizePhone("+14155550123")).toBe("+14155550123");
  });

  it("normalizes international number", () => {
    expect(normalizePhone("+447911123456")).toBe("+447911123456");
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("returns null for gibberish", () => {
    expect(normalizePhone("not-a-phone")).toBeNull();
  });

  it("returns null for too short", () => {
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("isValidE164", () => {
  it("accepts valid E.164", () => {
    expect(isValidE164("+14155550123")).toBe(true);
  });

  it("rejects number without + prefix", () => {
    expect(isValidE164("14155550123")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidE164("")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidE164("+1415abc0123")).toBe(false);
  });
});
