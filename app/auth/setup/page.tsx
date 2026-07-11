import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import SetupClient from "./SetupClient";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const auth = await getSessionAndUser();
  if (!auth) redirect("/auth");

  const { from } = await searchParams;
  return <SetupClient firstName={auth.user.name.split(" ")[0]} isRecovery={from === "recovery"} />;
}
