import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { sendMessage, getMessages, getMessageById } from "@/lib/db/queries/chat";
import { getTeamMembers } from "@/lib/db/queries/teams";
import { getPushSubscriptionsForUsers } from "@/lib/db/queries/push-subscriptions";
import { sendPushToUsers } from "@/lib/push/send";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { checkChatRateLimit } from "@/lib/auth/chat-rate-limit";

const sendSchema = z.object({ body: z.string().min(1).max(4000) });

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const sinceId = req.nextUrl.searchParams.get("since");
  let afterDate: Date | undefined;
  if (sinceId) {
    const sinceMsg = await getMessageById(sinceId);
    if (sinceMsg) afterDate = sinceMsg.sentAt;
  }

  const messages = await getMessages(teamId, {
    limit: 100,
    after: afterDate,
  });
  return ok(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const rateCheck = checkChatRateLimit(auth.user.id);
  if (!rateCheck.allowed) return err(rateCheck.reason ?? "Too many messages", 429);

  try {
    const body = await req.json();
    const { body: text } = sendSchema.parse(body);

    const message = await sendMessage({
      teamId,
      senderUserId: auth.user.id,
      body: text,
    });

    // Notify WebSocket listeners via Postgres NOTIFY
    await db.execute(
      sql`SELECT pg_notify(${`chat:${teamId}`}, ${JSON.stringify({ ...message, senderName: auth.user.name })})`,
    );

    // Fire-and-forget push to other team members
    const members = await getTeamMembers(teamId);
    const otherUserIds = members.map((m) => m.userId).filter((id) => id !== auth.user.id);
    if (otherUserIds.length > 0) {
      const subs = await getPushSubscriptionsForUsers(otherUserIds);
      if (subs.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        sendPushToUsers(subs, {
          title: auth.user.name,
          body: text.slice(0, 100),
          url: `${appUrl}/chat`,
        }).catch(() => {});
      }
    }

    return ok(message, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
