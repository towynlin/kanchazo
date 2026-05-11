import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { expireSession, expireAllUserSessions } from "@/lib/db/queries/sessions";
import { makeClearSessionCookieHeader } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";

const schema = z.object({ everywhere: z.boolean().optional() });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { everywhere } = schema.parse(body);

  if (everywhere) {
    await expireAllUserSessions(auth.user.id);
  } else {
    await expireSession(auth.session.id);
  }

  const response = ok({ signedOut: true });
  response.headers.set("Set-Cookie", makeClearSessionCookieHeader());
  return response;
}
