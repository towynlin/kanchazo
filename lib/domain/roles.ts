export type TeamRole = "parent" | "coach";
export type SystemRole = "admin";
export type AnyRole = TeamRole | SystemRole;

export function canViewTeam(_role: TeamRole): boolean {
  return true; // both parents and coaches can view
}

export function canCreateEvent(role: TeamRole): boolean {
  return role === "coach";
}

export function canEditEvent(role: TeamRole): boolean {
  return role === "coach";
}

export function canEditNotes(role: TeamRole): boolean {
  return role === "coach";
}

export function canInviteParent(role: TeamRole): boolean {
  return role === "coach";
}

export function canInviteCoach(role: AnyRole): boolean {
  return role === "coach" || role === "admin";
}

export function canEditAnyPlayer(role: TeamRole): boolean {
  return role === "coach";
}

export function canCreateTeam(role: TeamRole): boolean {
  return role === "coach";
}

export function canEditOwnPlayers(_role: TeamRole): boolean {
  return true; // both parents and coaches
}

export function canInviteCoGuardian(role: TeamRole, isGuardianOfAllPlayers: boolean): boolean {
  // Parents may share access to their own players; coaches may add a
  // co-guardian for any player on their team.
  return role === "coach" || isGuardianOfAllPlayers;
}

export function canRemoveMember(actorRole: TeamRole): boolean {
  return actorRole === "coach";
}
