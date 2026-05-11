import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { sendMessage, getMessages } from "@/lib/db/queries/chat";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

const sendSchema = z.object({ body: z.string().min(1).max(4000) });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  const before = req.nextUrl.searchParams.get("before");
  const messages = await getMessages(teamId, {
    limit: 50,
    before: before ? new Date(before) : undefined,
  });
  return ok(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

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

    return ok(message, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
