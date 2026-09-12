"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  MessageSquarePlus,
  Bot,
  Workflow,
  KanbanSquare,
  Wand2,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Start a chat",
    href: "/chats",
    icon: MessageSquarePlus,
    tint: "text-gold",
  },
  { label: "Launch an agent", href: "/chats/agents", icon: Bot, tint: "text-violet" },
  { label: "New workflow", href: "/office", icon: Workflow, tint: "text-complete" },
  {
    label: "Open KEVO board",
    href: "/office/board",
    icon: KanbanSquare,
    tint: "text-gold",
  },
  { label: "New media", href: "/media", icon: Wand2, tint: "text-[#c4b5fd]" },
];

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[32rem] justify-end pr-4">
      <div
        className="pointer-events-auto absolute bottom-[78px] right-4 flex flex-col items-end gap-3"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <AnimatePresence>
          {open &&
            ACTIONS.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-full border border-white/10 bg-sheet py-2 pl-4 pr-2 shadow-lg shadow-black/50"
                >
                  <span className="text-[14px] font-medium text-cream">
                    {action.label}
                  </span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/8 ${action.tint}`}
                  >
                    <action.icon size={17} />
                  </span>
                </Link>
              </motion.div>
            ))}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          whileTap={{ scale: 0.92 }}
          className="anim-grad-pan relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet shadow-xl shadow-violet/25"
        >
          <span className="absolute inset-[3px] rounded-full bg-canvas" />
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative z-10 text-cream"
          >
            <Plus size={26} strokeWidth={2.5} />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
