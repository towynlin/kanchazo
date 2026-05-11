import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  teams,
  teamMemberships,
  users,
  type Team,
  type NewTeam,
  type TeamMembership,
  type User,
} from "@/lib/db/schema";

export async function createTeam(data: NewTeam): Promise<Team> {
  const results = await db.insert(teams).values(data).returning();
  return results[0];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const results = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return results[0] ?? null;
}

export async function getTeamsByUser(userId: string): Promise<Team[]> {
  const rows = await db
    .select({ team: teams })
    .from(teams)
    .innerJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
    .where(eq(teamMemberships.userId, userId));
  return rows.map((r) => r.team);
}

export async function addTeamMember(data: {
  teamId: string;
  userId: string;
  role: "parent" | "coach";
}): Promise<TeamMembership> {
  const results = await db.insert(teamMemberships).values(data).returning();
  return results[0];
}

export async function getTeamMembership(
  teamId: string,
  userId: string,
): Promise<TeamMembership | null> {
  const results = await db
    .select()
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, teamId))
    .limit(100);
  return results.find((m) => m.userId === userId) ?? null;
}

export interface TeamMemberWithUser extends TeamMembership {
  user: User;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  const rows = await db
    .select({ membership: teamMemberships, user: users })
    .from(teamMemberships)
    .innerJoin(users, eq(users.id, teamMemberships.userId))
    .where(eq(teamMemberships.teamId, teamId));
  return rows.map((r) => ({ ...r.membership, user: r.user }));
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const results = await db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId));
  const membership = results.find((m) => m.userId === userId);
  if (membership) {
    await db.delete(teamMemberships).where(eq(teamMemberships.id, membership.id));
  }
}
