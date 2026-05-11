import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export async function writeAuditLog({
  actorUserId,
  teamId,
  action,
  target,
  payload,
}: {
  actorUserId: string | null;
  teamId: string | null;
  action: string;
  target?: string;
  payload?: unknown;
}): Promise<void> {
  await db.insert(auditLog).values({
    actorUserId,
    teamId,
    action,
    target: target ?? null,
    payload: payload !== undefined ? JSON.stringify(payload) : null,
  });
}
