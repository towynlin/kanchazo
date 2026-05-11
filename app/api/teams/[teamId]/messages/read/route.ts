import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeamMember } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { updateChatRead } from "@/lib/db/queries/chat";

const schema = z.object({ messageId: z.string().uuid() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireTeamMember(teamId);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { messageId } = schema.parse(body);
    await updateChatRead(auth.user.id, teamId, messageId);
    return ok({ ok: true });
  } catch (e) {
    return handleZodError(e);
  }
}
