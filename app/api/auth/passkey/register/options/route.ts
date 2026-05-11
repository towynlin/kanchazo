import { requireAuth } from "@/lib/api/require-auth";
import { buildRegistrationOptions } from "@/lib/auth/passkeys";
import { ok } from "@/lib/api/response";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const options = await buildRegistrationOptions(auth.user);
  // Store challenge in cookie for verification
  const response = ok(options);
  response.headers.set(
    "Set-Cookie",
    `webauthn_challenge=${options.challenge}; Path=/api/auth/passkey; HttpOnly; SameSite=Lax; Max-Age=300`,
  );
  return response;
}
