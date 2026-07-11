import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  formatRecoveryCode,
  normalizeRecoveryCode,
  isWellFormedRecoveryCode,
  RECOVERY_CODE_ALPHABET,
  RECOVERY_CODE_LENGTH,
} from "@/lib/domain/recovery-codes";

describe("recovery codes", () => {
  it("generates codes in XXXXX-XXXXX format from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRecoveryCode();
      expect(code).toMatch(/^[2-9A-HJKMNP-TV-Z]{5}-[2-9A-HJKMNP-TV-Z]{5}$/);
      for (const c of code.replace("-", "")) {
        expect(RECOVERY_CODE_ALPHABET).toContain(c);
      }
    }
  });

  it("generates distinct codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(100);
  });

  it("normalizes user input forgivingly", () => {
    expect(normalizeRecoveryCode("k7mpq-2xw9t")).toBe("K7MPQ2XW9T");
    expect(normalizeRecoveryCode(" K7MPQ 2XW9T ")).toBe("K7MPQ2XW9T");
    expect(normalizeRecoveryCode("k7mpq–2xw9t")).toBe("K7MPQ2XW9T"); // en dash
  });

  it("round-trips generate → normalize → format", () => {
    const code = generateRecoveryCode();
    const normalized = normalizeRecoveryCode(code);
    expect(normalized).toHaveLength(RECOVERY_CODE_LENGTH);
    expect(formatRecoveryCode(normalized)).toBe(code);
  });

  it("validates well-formed codes", () => {
    expect(isWellFormedRecoveryCode(generateRecoveryCode())).toBe(true);
    expect(isWellFormedRecoveryCode("k7mpq-2xw9t")).toBe(true);
    expect(isWellFormedRecoveryCode("")).toBe(false);
    expect(isWellFormedRecoveryCode("ABC")).toBe(false);
    expect(isWellFormedRecoveryCode("K7MPQ-2XW9T-EXTRA")).toBe(false);
    // O, 1, I, L are not in the alphabet
    expect(isWellFormedRecoveryCode("OOOOO-11111")).toBe(false);
  });
});
