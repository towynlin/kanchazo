import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const teams = await getTeamsByUser(auth.user.id);
  if (teams.length === 0) {
    // First-time user with no team — show empty state inside the shell
  }

  return (
    <AppShell user={auth.user} teams={teams}>
      {children}
    </AppShell>
  );
}
