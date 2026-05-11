import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const [teams, cookieStore] = await Promise.all([
    getTeamsByUser(auth.user.id),
    cookies(),
  ]);

  const savedTeamId = cookieStore.get("kanchazo_team")?.value;
  const initialTeamId = teams.find((t) => t.id === savedTeamId)?.id ?? teams[0]?.id;

  return (
    <AppShell user={auth.user} teams={teams} initialTeamId={initialTeamId}>
      {children}
    </AppShell>
  );
}
