import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import {
  upsertPushSubscription,
  deletePushSubscription,
} from "@/lib/db/queries/push-subscriptions";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

const unsubscribeSchema = z.object({ endpoint: z.string() });

// POST /api/push — register a push subscription
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { endpoint, keys } = subscribeSchema.parse(await req.json());
    await upsertPushSubscription({
      userId: auth.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    return ok({ subscribed: true });
  } catch (e) {
    return handleZodError(e);
  }
}

// DELETE /api/push — unregister a push subscription
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { endpoint } = unsubscribeSchema.parse(await req.json());
    await deletePushSubscription(endpoint, auth.user.id);
    return ok({ unsubscribed: true });
  } catch (e) {
    return handleZodError(e);
  }
}

// GET /api/push — return VAPID public key
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  if (!publicKey) return err("Push notifications not configured", 503);
  return ok({ publicKey });
}
