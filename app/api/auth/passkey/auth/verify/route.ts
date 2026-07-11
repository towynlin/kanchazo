import { NextRequest } from "next/server";
import { verifyAuthentication } from "@/lib/auth/passkeys";
import { createSessionForUser, makeSessionCookieHeader } from "@/lib/auth/session";
import { ok, err } from "@/lib/api/response";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const challenge = cookieStore.get("webauthn_challenge")?.value;
  if (!challenge) return err("No challenge found", 400);

  const body = await req.json();
  const result = await verifyAuthentication(body, challenge);

  if (!result.verified || !result.userId) {
    return err("Authentication failed", 401);
  }

  const { rawSessionToken } = await createSessionForUser(result.userId);
  const response = ok({ verified: true });
  response.headers.set("Set-Cookie", makeSessionCookieHeader(rawSessionToken));
  return response;
}
