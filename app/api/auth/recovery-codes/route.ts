import { requireAuth } from "@/lib/api/require-auth";
import { ok } from "@/lib/api/response";
import { issueRecoveryCodes } from "@/lib/auth/recovery";

// Regenerate the caller's recovery codes. The raw codes are returned exactly once;
// any previously issued codes are invalidated.
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const codes = await issueRecoveryCodes(auth.user.id);
  return ok({ codes });
}
