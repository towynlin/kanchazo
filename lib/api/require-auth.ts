import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamMembership } from "@/lib/db/queries/teams";
import { err } from "./response";
import type { NextResponse } from "next/server";
import type { User, Session } from "@/lib/db/schema";

type AuthResult =
  { ok: true; user: User; session: Session } | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const result = await getSessionAndUser();
  if (!result) {
    return { ok: false, response: err("Unauthorized", 401) };
  }
  return { ok: true, user: result.user, session: result.session };
}

type TeamAuthResult =
  | { ok: true; user: User; session: Session; role: "parent" | "coach" }
  | { ok: false; response: NextResponse };

export async function requireTeamMember(teamId: string): Promise<TeamAuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const membership = await getTeamMembership(teamId, auth.user.id);
  if (!membership) {
    return { ok: false, response: err("Forbidden", 403) };
  }
  return { ok: true, user: auth.user, session: auth.session, role: membership.role };
}

export async function requireCoach(teamId: string): Promise<TeamAuthResult> {
  const result = await requireTeamMember(teamId);
  if (!result.ok) return result;
  if (result.role !== "coach") {
    return { ok: false, response: err("Coach access required", 403) };
  }
  return result;
}
