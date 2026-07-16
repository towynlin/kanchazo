import { describe, it, expect } from "vitest";
import { gameOutcome, formatGameScore } from "@/lib/domain/game-reports";
import { canViewGameReport, canEditGameReport } from "@/lib/domain/roles";

describe("gameOutcome", () => {
  it("returns win when our score is higher", () => {
    expect(gameOutcome(3, 1)).toBe("win");
  });

  it("returns loss when opponent score is higher", () => {
    expect(gameOutcome(0, 2)).toBe("loss");
  });

  it("returns tie when scores are equal", () => {
    expect(gameOutcome(2, 2)).toBe("tie");
  });

  it("returns null when either score is missing", () => {
    expect(gameOutcome(null, 2)).toBeNull();
    expect(gameOutcome(3, null)).toBeNull();
    expect(gameOutcome(null, null)).toBeNull();
  });
});

describe("formatGameScore", () => {
  it("formats win, loss, and tie", () => {
    expect(formatGameScore(3, 1)).toBe("W 3–1");
    expect(formatGameScore(0, 2)).toBe("L 0–2");
    expect(formatGameScore(2, 2)).toBe("T 2–2");
  });

  it("returns empty string when a score is missing", () => {
    expect(formatGameScore(null, 1)).toBe("");
    expect(formatGameScore(1, null)).toBe("");
  });
});

describe("game report permissions", () => {
  it("only coaches can view the game report", () => {
    expect(canViewGameReport("coach")).toBe(true);
    expect(canViewGameReport("parent")).toBe(false);
  });

  it("only coaches can edit the game report", () => {
    expect(canEditGameReport("coach")).toBe(true);
    expect(canEditGameReport("parent")).toBe(false);
  });
});
