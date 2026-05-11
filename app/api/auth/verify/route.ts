import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { makeSessionCookieHeader } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(new URL("/auth?error=missing", req.url));
  }

  const result = await verifyMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/auth?error=invalid", req.url));
  }

  if (result.isNewUser) {
    const encoded = encodeURIComponent(result.phone);
    return NextResponse.redirect(new URL(`/auth/onboard?phone=${encoded}`, req.url));
  }

  const response = NextResponse.redirect(new URL("/schedule", req.url));
  response.headers.set("Set-Cookie", makeSessionCookieHeader(result.rawSessionToken));
  return response;
}
