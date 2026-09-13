"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, KanbanSquare, Activity, Mail, Workflow } from "lucide-react";

const SUB_TABS = [
  { href: "/office", label: "Home", icon: Home, exact: true },
  { href: "/office/inbox", label: "Inbox", icon: Mail, exact: false },
  { href: "/workflows", label: "Workflows", icon: Workflow, exact: false },
  { href: "/office/directory", label: "Directory", icon: Users },
  { href: "/office/board", label: "Board", icon: KanbanSquare },
  { href: "/office/pulse", label: "Pulse", icon: Activity },
];

export function OfficeSubTabs() {
  const pathname = usePathname();
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {SUB_TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition ${
              active
                ? "bg-gold text-canvas"
                : "bg-elevated text-sand"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
