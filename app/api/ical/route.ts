import { requireAuth } from "@/lib/api/require-auth";
import { ok } from "@/lib/api/response";
import { getOrCreateIcalToken } from "@/lib/db/queries/ical-tokens";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const token = await getOrCreateIcalToken(auth.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/api/ical/${token}`;

  return ok({ url });
}
