import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { OrethaMark } from "@/components/ui/OrethaMark";

/**
 * Public /muse-dashboard layout — the second route that does NOT redirect
 * logged-out visitors, same shape as /forge. Signed-in users with setup
 * complete get the normal in-app shell (BottomNav + FAB, same as before);
 * everyone else gets a minimal public shell: brand header, sign-in link,
 * and the free-account call-to-action.
 *
 * Every other (mobile) route still gates through its own layout, which
 * redirects to /welcome without a session and to /setup when setup is
 * incomplete. Nothing here weakens that.
 */
export default async function MuseDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (user && user.setupCompleted) {
    return (
      <AppShell user={user}>
        <div className="pad-safe-top">{children}</div>
      </AppShell>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[32rem] flex-col bg-canvas">
      <header className="flex items-center justify-between px-4 pb-3 pad-safe-top">
        <Link href="/welcome" className="flex items-center gap-2">
          <OrethaMark size={32} />
          <span className="font-display text-[17px] font-bold text-cream">Oretha AI</span>
        </Link>
        <Link
          href="/signin"
          className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-cream transition active:scale-[0.97]"
        >
          Sign in
        </Link>
      </header>
      <div className="px-4 pb-1">
        <Link
          href="/signup"
          className="block rounded-[16px] border border-gold/30 bg-gold/10 p-3.5 text-center transition active:scale-[0.99]"
        >
          <span className="text-[13.5px] font-semibold text-cream">
            Create a free account to save your dashboard data →
          </span>
        </Link>
      </div>
      {children}
    </div>
  );
}
