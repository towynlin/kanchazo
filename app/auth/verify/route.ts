import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { makeSessionCookieHeader } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(new URL("/auth?error=missing", appUrl));
  }

  const result = await verifyMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/auth?error=invalid", appUrl));
  }

  if (result.isNewUser) {
    const encoded = encodeURIComponent(result.phone);
    return NextResponse.redirect(new URL(`/auth/onboard?phone=${encoded}`, appUrl));
  }

  const response = NextResponse.redirect(new URL("/schedule", appUrl));
  response.headers.set("Set-Cookie", makeSessionCookieHeader(result.rawSessionToken));
  return response;
}
