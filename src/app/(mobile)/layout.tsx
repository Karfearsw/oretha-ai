import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/welcome");
  }
  if (!user.setupCompleted) {
    redirect("/setup");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
