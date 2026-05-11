import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import { getMessages } from "@/lib/db/queries/chat";
import ChatClient from "./ChatClient";
import { selectTeam } from "@/lib/api/selected-team";

export default async function ChatPage() {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const teams = await getTeamsByUser(auth.user.id);
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-gray-500">No teams yet.</p>
      </div>
    );
  }

  const team = (await selectTeam(teams))!;
  const messages = await getMessages(team.id, { limit: 50 });

  const serialized = messages.map((m) => ({
    id: m.id,
    senderName: m.senderName ?? "Unknown",
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    isMe: m.senderUserId === auth.user.id,
  }));

  return (
    <ChatClient
      teamId={team.id}
      userId={auth.user.id}
      userName={auth.user.name}
      initialMessages={serialized}
    />
  );
}
