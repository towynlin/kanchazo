import { cookies } from "next/headers";
import { hashToken } from "./tokens";
import { findSessionByTokenHash, touchSession } from "@/lib/db/queries/sessions";
import { findUserById } from "@/lib/db/queries/users";
import type { Session, User } from "@/lib/db/schema";

const SESSION_COOKIE = "kanchazo_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days rolling

export async function getSessionAndUser(): Promise<
  { session: Session; user: User } | null
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const hash = hashToken(raw);
  const session = await findSessionByTokenHash(hash);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  // Rolling expiry — touch in background (don't await)
  const newExpiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  touchSession(session.id, newExpiresAt).catch(() => {});

  return { session, user };
}

export function makeSessionCookieHeader(rawToken: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = SESSION_LIFETIME_MS / 1000;
  return [
    `${SESSION_COOKIE}=${rawToken}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function makeClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
