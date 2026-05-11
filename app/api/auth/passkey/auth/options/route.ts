import { buildAuthenticationOptions } from "@/lib/auth/passkeys";
import { ok } from "@/lib/api/response";

export async function POST() {
  const options = await buildAuthenticationOptions();
  const response = ok(options);
  response.headers.set(
    "Set-Cookie",
    `webauthn_challenge=${options.challenge}; Path=/api/auth/passkey; HttpOnly; SameSite=Lax; Max-Age=300`,
  );
  return response;
}
