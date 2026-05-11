import { describe, it, expect } from "vitest";
import {
  isValidAvailabilityStatus,
  availabilityLabel,
  availabilitySummary,
} from "@/lib/domain/availability";

describe("isValidAvailabilityStatus", () => {
  it("accepts yes", () => expect(isValidAvailabilityStatus("yes")).toBe(true));
  it("accepts no", () => expect(isValidAvailabilityStatus("no")).toBe(true));
  it("accepts maybe", () => expect(isValidAvailabilityStatus("maybe")).toBe(true));
  it("rejects invalid", () => expect(isValidAvailabilityStatus("going")).toBe(false));
  it("rejects empty", () => expect(isValidAvailabilityStatus("")).toBe(false));
});

describe("availabilityLabel", () => {
  it("yes → Yes", () => expect(availabilityLabel("yes")).toBe("Yes"));
  it("no → No", () => expect(availabilityLabel("no")).toBe("No"));
  it("maybe → Maybe", () => expect(availabilityLabel("maybe")).toBe("Maybe"));
});

describe("availabilitySummary", () => {
  it("counts all statuses and unanswered", () => {
    const statuses = ["yes", "yes", "no", "maybe", "maybe", "maybe"] as const;
    const total = 8; // 2 more players with no response
    expect(availabilitySummary(statuses, total)).toEqual({
      yes: 2,
      no: 1,
      maybe: 3,
      unanswered: 2,
    });
  });

  it("handles all answered", () => {
    const statuses = ["yes", "no"] as const;
    expect(availabilitySummary(statuses, 2)).toEqual({
      yes: 1,
      no: 1,
      maybe: 0,
      unanswered: 0,
    });
  });
});
