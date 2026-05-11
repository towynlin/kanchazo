import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  players,
  playerGuardians,
  users,
  type Player,
  type NewPlayer,
  type User,
} from "@/lib/db/schema";

export async function createPlayer(data: NewPlayer): Promise<Player> {
  const results = await db.insert(players).values(data).returning();
  return results[0];
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const results = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return results[0] ?? null;
}

export async function getTeamPlayers(teamId: string): Promise<Player[]> {
  return db.select().from(players).where(eq(players.teamId, teamId));
}

export async function updatePlayer(
  id: string,
  data: Partial<Pick<Player, "name">>,
): Promise<Player | null> {
  const results = await db.update(players).set(data).where(eq(players.id, id)).returning();
  return results[0] ?? null;
}

export async function addGuardian(playerId: string, userId: string): Promise<void> {
  await db.insert(playerGuardians).values({ playerId, userId }).onConflictDoNothing();
}

export async function removeGuardian(playerId: string, userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(playerGuardians)
    .where(eq(playerGuardians.playerId, playerId));
  const row = rows.find((r) => r.userId === userId);
  if (row) {
    await db.delete(playerGuardians).where(eq(playerGuardians.id, row.id));
  }
}

export async function getPlayerGuardians(playerId: string): Promise<User[]> {
  const rows = await db
    .select({ user: users })
    .from(playerGuardians)
    .innerJoin(users, eq(users.id, playerGuardians.userId))
    .where(eq(playerGuardians.playerId, playerId));
  return rows.map((r) => r.user);
}

export async function getPlayersByGuardian(userId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(playerGuardians)
    .innerJoin(players, eq(players.id, playerGuardians.playerId))
    .where(eq(playerGuardians.userId, userId));
  return rows.map((r) => r.player);
}
