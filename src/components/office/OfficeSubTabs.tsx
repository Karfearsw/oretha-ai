"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrethaIcon, type OrethaIconName } from "@/components/brand/OrethaIcon";

const SUB_TABS: { href: string; label: string; icon: OrethaIconName; exact?: boolean }[] = [
  { href: "/office", label: "Home", icon: "office", exact: true },
  { href: "/office/inbox", label: "Inbox", icon: "inbox" },
  { href: "/workflows", label: "Workflows", icon: "workflows" },
  { href: "/office/directory", label: "Directory", icon: "directory" },
  { href: "/office/board", label: "Board", icon: "board" },
  { href: "/office/pulse", label: "Pulse", icon: "pulse" },
];

export function OfficeSubTabs() {
  const pathname = usePathname();
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {SUB_TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition ${active ? "bg-gold text-canvas" : "bg-elevated text-sand"}`}
          >
            <OrethaIcon name={tab.icon} size={16} tone={active ? "cream" : "clay"} active={active} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
