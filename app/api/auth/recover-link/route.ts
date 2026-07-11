import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { peekRecoveryLink, redeemRecoveryLink } from "@/lib/auth/recovery";
import { checkRecoveryRateLimit } from "@/lib/auth/recovery-rate-limit";
import { makeSessionCookieHeader } from "@/lib/auth/session";

// GET /api/auth/recover-link?token=… — validate without consuming, for the landing page
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return err("Missing token", 400);

  const info = await peekRecoveryLink(token);
  if (!info) return err("This recovery link is invalid or has expired.", 404);
  return ok({ userName: info.userName });
}

const schema = z.object({ token: z.string().min(1) });

// POST /api/auth/recover-link — consume the link and sign in (requires an explicit tap,
// so link-preview bots that GET the URL can't burn it)
export async function POST(req: NextRequest) {
  const clientKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRecoveryRateLimit(clientKey);
  if (!rate.allowed) return err(rate.reason!, 429);

  try {
    const { token } = schema.parse(await req.json());
    const result = await redeemRecoveryLink(token);
    if (!result.ok) return err(result.error, 401);

    const response = ok({ signedIn: true });
    response.headers.set("Set-Cookie", makeSessionCookieHeader(result.rawSessionToken));
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}
