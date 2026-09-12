"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? "border-gold/60 bg-gold/30" : "border-white/15 bg-white/8"}`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${checked ? "left-[26px] bg-gold" : "left-[3px] bg-sand"}`}
      />
    </button>
  );
}
