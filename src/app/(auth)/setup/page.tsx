import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SetupWizard } from "@/components/setup/SetupWizard";

export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/welcome");
  }
  if (user.setupCompleted) {
    redirect("/hub");
  }

  return <SetupWizard />;
}
