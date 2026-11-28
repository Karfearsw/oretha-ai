import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = {
  title: "Muse Dashboard — Free starter, no account needed | Oretha AI",
  description:
    "Copy one extensive prompt into your own Muse and it builds your personal dashboard — six pillars, today at a glance, a scored daily routine, leads, and desks. Free to use — no account needed.",
};

/**
 * Public /muse-dashboard route. Anyone can read the starter prompt and see
 * the preview layout logged out; a visitor is only "signed in" for
 * send-to-chat purposes when a session exists and setup is complete (the
 * same bar as the /chats routes). Without an account, nothing is stored.
 */
export default async function MuseDashboardRoutePage() {
  const user = await getSessionUser();
  return <DashboardPage signedIn={!!user && user.setupCompleted} />;
}
