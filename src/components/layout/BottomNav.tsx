"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrethaIcon, type OrethaIconName } from "@/components/brand/OrethaIcon";

export const TABS: { href: string; label: string; icon: OrethaIconName }[] = [
  { href: "/hub", label: "Hub", icon: "hub" },
  { href: "/chats", label: "Chats", icon: "chats" },
  { href: "/office", label: "Office", icon: "office" },
  { href: "/media", label: "Lab", icon: "media" },
  { href: "/profile", label: "You", icon: "profile" },
];

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
          if (i === 2) return <div key="fab-slot" className="pointer-events-none" aria-hidden />;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex h-16 flex-col items-center justify-center gap-1 transition active:scale-95 ${active ? "" : "opacity-80"}`}
              aria-current={active ? "page" : undefined}
            >
              <OrethaIcon name={tab.icon} size={22} tone={active ? "gold" : "clay"} active={active} glow={active} />
              <span className={`text-[10px] font-medium ${active ? "text-gold" : "text-clay"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
