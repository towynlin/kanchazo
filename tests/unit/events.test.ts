import { describe, it, expect } from "vitest";
import {
  isCancelledEvent,
  isPastEvent,
  formatEventTitle,
  formatEventTimeRange,
} from "@/lib/domain/events";

const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
const past = new Date(Date.now() - 1000 * 60 * 60);

describe("isCancelledEvent", () => {
  it("returns true for cancelled status", () => {
    expect(isCancelledEvent({ status: "cancelled" })).toBe(true);
  });

  it("returns false for scheduled status", () => {
    expect(isCancelledEvent({ status: "scheduled" })).toBe(false);
  });
});

describe("isPastEvent", () => {
  it("returns true when startsAt is in the past", () => {
    expect(isPastEvent({ startsAt: past })).toBe(true);
  });

  it("returns false when startsAt is in the future", () => {
    expect(isPastEvent({ startsAt: future })).toBe(false);
  });
});

describe("formatEventTitle", () => {
  it("formats practice", () => {
    expect(formatEventTitle({ kind: "practice" })).toBe("Practice");
  });

  it("formats home game", () => {
    expect(formatEventTitle({ kind: "game", opponentName: "Eagles", isHome: true })).toBe(
      "vs Eagles (Home)",
    );
  });

  it("formats away game", () => {
    expect(formatEventTitle({ kind: "game", opponentName: "Bears", isHome: false })).toBe(
      "@ Bears (Away)",
    );
  });

  it("formats game with no opponent", () => {
    expect(formatEventTitle({ kind: "game", opponentName: null, isHome: null })).toBe("Game");
  });
});

describe("formatEventTimeRange", () => {
  it("shows start time only when no endsAt", () => {
    const d = new Date("2025-06-15T14:00:00Z");
    const result = formatEventTimeRange(d, null, "UTC");
    expect(result).toMatch(/2:00/);
  });

  it("shows range when endsAt provided", () => {
    const start = new Date("2025-06-15T14:00:00Z");
    const end = new Date("2025-06-15T16:00:00Z");
    const result = formatEventTimeRange(start, end, "UTC");
    expect(result).toMatch(/2:00/);
    expect(result).toMatch(/4:00/);
    expect(result).toContain("–");
  });
});
