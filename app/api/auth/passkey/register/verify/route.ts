import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { verifyRegistration } from "@/lib/auth/passkeys";
import { ok, err } from "@/lib/api/response";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const cookieStore = await cookies();
  const challenge = cookieStore.get("webauthn_challenge")?.value;
  if (!challenge) return err("No challenge found", 400);

  const body = await req.json();
  const verification = await verifyRegistration(auth.user, body, challenge);

  if (!verification.verified) {
    return err("Passkey registration failed", 400);
  }
  return ok({ verified: true });
}
