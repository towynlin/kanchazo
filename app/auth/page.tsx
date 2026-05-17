import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";
import AuthClient from "./AuthClient";

export default async function AuthPage() {
  const result = await getSessionAndUser();
  if (result) {
    redirect("/schedule");
  }
  return <AuthClient />;
}
