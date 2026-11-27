import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ForgePage } from "@/components/forge/ForgePage";

export const metadata: Metadata = {
  title: "Prompt Forge — Free, no account needed | Oretha AI",
  description:
    "Score any rough prompt on the 4-part brief and forge it into a clean prompt, a task, or a BMAD build. Free to use — no account needed.",
};

/**
 * Public /forge route. Anyone can use the whole tool logged out; a visitor
 * is only "signed in" for Send-to-chat purposes when a session exists and
 * setup is complete (the same bar as the /chats routes).
 */
export default async function ForgeRoutePage() {
  const user = await getSessionUser();
  return <ForgePage signedIn={!!user && user.setupCompleted} />;
}
