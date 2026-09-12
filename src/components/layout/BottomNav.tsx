"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessagesSquare, Building2, Sparkles, User } from "lucide-react";

export const TABS = [
  { href: "/hub", label: "Hub", icon: Home },
  { href: "/chats", label: "Chats", icon: MessagesSquare },
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/media", label: "Lab", icon: Sparkles },
  { href: "/profile", label: "You", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[32rem] border-t border-white/8 bg-canvas/92 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab, i) => {
          const active = isActive(tab.href);
          // leave a gap under the FAB (center slot)
          if (i === 2) {
            return (
              <div key="fab-slot" className="pointer-events-none" aria-hidden />
            );
          }
          const content = (
            <>
              <tab.icon
                size={22}
                className={active ? "text-gold" : "text-clay"}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`text-[10px] font-medium ${active ? "text-gold" : "text-clay"}`}
              >
                {tab.label}
              </span>
            </>
          );
          const cls = `flex h-16 flex-col items-center justify-center gap-1 transition active:scale-95 ${active ? "" : "opacity-80"}`;
          return i < 2 ? (
            <Link key={tab.href} href={tab.href} className={cls} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          ) : (
            <Link key={tab.href} href={tab.href} className={cls} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
