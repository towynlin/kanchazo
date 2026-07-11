import { describe, it, expect } from "vitest";
import {
  canEditEvent,
  canCreateEvent,
  canEditNotes,
  canInviteParent,
  canInviteCoach,
  canEditAnyPlayer,
  canCreateTeam,
  canViewTeam,
  canInviteCoGuardian,
  canEditOwnPlayers,
} from "@/lib/domain/roles";

describe("parent permissions", () => {
  it("can view team", () => expect(canViewTeam("parent")).toBe(true));
  it("cannot create events", () => expect(canCreateEvent("parent")).toBe(false));
  it("cannot edit events", () => expect(canEditEvent("parent")).toBe(false));
  it("cannot edit notes", () => expect(canEditNotes("parent")).toBe(false));
  it("cannot invite parents", () => expect(canInviteParent("parent")).toBe(false));
  it("cannot invite coaches", () => expect(canInviteCoach("parent")).toBe(false));
  it("cannot edit any player", () => expect(canEditAnyPlayer("parent")).toBe(false));
  it("cannot create teams", () => expect(canCreateTeam("parent")).toBe(false));
  it("can edit own players", () => expect(canEditOwnPlayers("parent")).toBe(true));
  it("can invite co-guardian for own players", () =>
    expect(canInviteCoGuardian("parent", true)).toBe(true));
  it("cannot invite co-guardian for other players", () =>
    expect(canInviteCoGuardian("parent", false)).toBe(false));
});

describe("coach permissions", () => {
  it("can view team", () => expect(canViewTeam("coach")).toBe(true));
  it("can create events", () => expect(canCreateEvent("coach")).toBe(true));
  it("can edit events", () => expect(canEditEvent("coach")).toBe(true));
  it("can edit notes", () => expect(canEditNotes("coach")).toBe(true));
  it("can invite parents", () => expect(canInviteParent("coach")).toBe(true));
  it("can invite coaches", () => expect(canInviteCoach("coach")).toBe(true));
  it("can edit any player", () => expect(canEditAnyPlayer("coach")).toBe(true));
  it("can create teams", () => expect(canCreateTeam("coach")).toBe(true));
  it("can edit own players", () => expect(canEditOwnPlayers("coach")).toBe(true));
  it("can invite co-guardian for own players", () =>
    expect(canInviteCoGuardian("coach", true)).toBe(true));
  it("can invite co-guardian for any player", () =>
    expect(canInviteCoGuardian("coach", false)).toBe(true));
});

describe("admin permissions", () => {
  it("can create teams (via inviting first coach)", () => {
    // Admins invite the first coach who then creates a team
    expect(canInviteCoach("admin")).toBe(true);
  });
});
