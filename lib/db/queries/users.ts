import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type NewUser, type User } from "@/lib/db/schema";

export async function findUserByPhone(phone: string): Promise<User | null> {
  const results = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return results[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return results[0] ?? null;
}

export async function createUser(data: NewUser): Promise<User> {
  const results = await db.insert(users).values(data).returning();
  return results[0];
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "name" | "email" | "phone">>,
): Promise<User | null> {
  const results = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return results[0] ?? null;
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
