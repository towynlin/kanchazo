import { describe, it, expect } from "vitest";
import { generateIcal } from "@/lib/ical/generate";
import type { Event, Team } from "@/lib/db/schema";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "evt-1",
    teamId: "team-1",
    kind: "practice",
    status: "scheduled",
    location: "Main Field",
    opponentName: null,
    isHome: null,
    notes: null,
    startsAt: new Date("2025-06-01T10:00:00Z"),
    endsAt: new Date("2025-06-01T11:30:00Z"),
    createdByUserId: null,
    updatedByUserId: null,
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    name: "Tigers",
    timeZone: "America/New_York",
    createdByUserId: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("generateIcal", () => {
  it("produces valid VCALENDAR structure", () => {
    const ical = generateIcal([], new Map(), "Test Calendar");
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("X-WR-CALNAME:Test Calendar");
  });

  it("includes a VEVENT for each event", () => {
    const events = [makeEvent({ id: "e1" }), makeEvent({ id: "e2" })];
    const teamMap = new Map([["team-1", makeTeam()]]);
    const ical = generateIcal(events, teamMap, "Cal");
    expect((ical.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect((ical.match(/END:VEVENT/g) ?? []).length).toBe(2);
    expect(ical).toContain("UID:e1@kanchazo");
    expect(ical).toContain("UID:e2@kanchazo");
  });

  it("includes location and time", () => {
    const event = makeEvent({ location: "Rec Center" });
    const teamMap = new Map([["team-1", makeTeam()]]);
    const ical = generateIcal([event], teamMap, "Cal");
    expect(ical).toContain("LOCATION:Rec Center");
    expect(ical).toContain("DTSTART:");
    expect(ical).toContain("DTEND:");
  });

  it("marks cancelled events with STATUS:CANCELLED", () => {
    const event = makeEvent({ status: "cancelled" });
    const teamMap = new Map([["team-1", makeTeam()]]);
    const ical = generateIcal([event], teamMap, "Cal");
    expect(ical).toContain("STATUS:CANCELLED");
    expect(ical).toContain("[Cancelled]");
  });

  it("prefixes event title with team name", () => {
    const event = makeEvent();
    const teamMap = new Map([["team-1", makeTeam({ name: "Eagles" })]]);
    const ical = generateIcal([event], teamMap, "Cal");
    expect(ical).toContain("Eagles:");
  });

  it("includes notes in DESCRIPTION", () => {
    const event = makeEvent({ notes: "Bring water" });
    const teamMap = new Map([["team-1", makeTeam()]]);
    const ical = generateIcal([event], teamMap, "Cal");
    expect(ical).toContain("DESCRIPTION:Bring water");
  });

  it("escapes special characters in event fields", () => {
    const event = makeEvent({ location: "Field, Lot #2" });
    const teamMap = new Map([["team-1", makeTeam()]]);
    const ical = generateIcal([event], teamMap, "Cal");
    expect(ical).toContain("LOCATION:Field\\, Lot #2");
  });

  it("uses CRLF line endings", () => {
    const ical = generateIcal([], new Map(), "Cal");
    expect(ical).toContain("\r\n");
    expect(ical.split("\r\n").length).toBeGreaterThan(5);
  });
});
