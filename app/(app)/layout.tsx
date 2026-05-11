import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import { getLatestMessage, getChatRead } from "@/lib/db/queries/chat";
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

  let chatUnread = false;
  if (initialTeamId) {
    const [latest, readState] = await Promise.all([
      getLatestMessage(initialTeamId),
      getChatRead(auth.user.id, initialTeamId),
    ]);
    chatUnread = !!(latest && latest.id !== readState?.lastReadMessageId);
  }

  return (
    <AppShell user={auth.user} teams={teams} initialTeamId={initialTeamId} chatUnread={chatUnread}>
      {children}
    </AppShell>
  );
}
