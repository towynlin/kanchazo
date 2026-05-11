import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth/session";

export default async function RootPage() {
  const result = await getSessionAndUser();
  if (result) {
    redirect("/schedule");
  } else {
    redirect("/auth");
  }
}
