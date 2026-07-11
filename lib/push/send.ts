import webpush from "web-push";
import { removeStaleSubscription } from "@/lib/db/queries/push-subscriptions";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@kanchazo.com";
  if (!publicKey || !privateKey) return; // push disabled in dev without keys
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  ensureConfigured();
  if (!configured) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Subscription is no longer valid; clean it up
      await removeStaleSubscription(subscription.endpoint);
    }
  }
}

export async function sendPushToUsers(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
) {
  await Promise.all(subscriptions.map((s) => sendPushToSubscription(s, payload)));
}
