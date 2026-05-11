import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { passkeys } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const rows = await db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, auth.user.id)))
    .limit(1);

  if (!rows[0]) return err("Passkey not found", 404);

  await db.delete(passkeys).where(eq(passkeys.id, id));
  return ok({ deleted: true });
}
