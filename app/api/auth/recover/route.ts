import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { redeemRecoveryCode } from "@/lib/auth/recovery";
import { checkRecoveryRateLimit } from "@/lib/auth/recovery-rate-limit";
import { makeSessionCookieHeader } from "@/lib/auth/session";

const schema = z.object({ code: z.string().min(1).max(64) });

export async function POST(req: NextRequest) {
  const clientKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRecoveryRateLimit(clientKey);
  if (!rate.allowed) return err(rate.reason!, 429);

  try {
    const { code } = schema.parse(await req.json());
    const result = await redeemRecoveryCode(code);
    if (!result.ok) return err(result.error, 401);

    const response = ok({ signedIn: true });
    response.headers.set("Set-Cookie", makeSessionCookieHeader(result.rawSessionToken));
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}
