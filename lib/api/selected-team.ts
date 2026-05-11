import { cookies } from "next/headers";
import type { Team } from "@/lib/db/schema";

export async function selectTeam(teams: Team[]): Promise<Team | null> {
  if (teams.length === 0) return null;
  const cookieStore = await cookies();
  const savedId = cookieStore.get("kanchazo_team")?.value;
  return teams.find((t) => t.id === savedId) ?? teams[0];
}
