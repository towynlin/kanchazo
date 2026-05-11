import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import { getPasskeysForUser } from "@/lib/auth/passkeys";
import { getTeamsByUser } from "@/lib/db/queries/teams";
import { getMutedTeamIds } from "@/lib/db/queries/push-team-mutes";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const [passkeys, teams, mutedTeamIds] = await Promise.all([
    getPasskeysForUser(auth.user.id),
    getTeamsByUser(auth.user.id),
    getMutedTeamIds(auth.user.id),
  ]);

  return (
    <SettingsClient
      user={{
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone,
      }}
      passkeys={passkeys.map((pk) => ({
        id: pk.id,
        deviceName: pk.deviceName,
        createdAt: pk.createdAt.toISOString(),
        lastUsedAt: pk.lastUsedAt?.toISOString() ?? null,
      }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      mutedTeamIds={mutedTeamIds}
    />
  );
}
