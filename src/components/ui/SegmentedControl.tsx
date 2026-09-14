"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { OrethaIcon, type OrethaIconName } from "@/components/brand/OrethaIcon";

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon | OrethaIconName;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  iconOnly = false,
}: {
  items: SegmentItem<T>[];
  value: T;
  onChange: (v: T) => void;
  iconOnly?: boolean;
}) {
  const groupId = useId();
  return (
    <div className={`relative flex items-center rounded-full bg-elevated p-1 ${iconOnly ? "h-14 justify-between px-2" : "h-12"}`} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        const isOretha = typeof item.icon === "string";
        return (
          <button key={item.value} role="tab" aria-selected={active} onClick={() => onChange(item.value)} className={`relative flex flex-1 items-center justify-center gap-2 rounded-full transition ${iconOnly ? "h-11" : "h-10 px-4"}`}>
            {active && <motion.span layoutId={`seg-pill-${groupId}`} className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            {isOretha ? <OrethaIcon name={item.icon as OrethaIconName} size={18} tone={active ? "gold" : "clay"} active={active} /> : (() => { const Icon = item.icon as LucideIcon; return <Icon size={18} className={`relative z-10 ${active ? "text-cream" : "text-clay"}`} />; })()}
            {!iconOnly && <span className={`relative z-10 text-[13px] font-medium ${active ? "text-cream" : "text-clay"}`}>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
