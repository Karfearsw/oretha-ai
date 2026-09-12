import type { ReactNode } from "react";

export type ChipTone =
  | "neutral"
  | "gold"
  | "violet"
  | "complete"
  | "alert"
  | "outline";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-white/8 text-sand",
  gold: "bg-gold/15 text-gold",
  violet: "bg-violet/20 text-[#c4b5fd]",
  complete: "bg-complete/15 text-complete",
  alert: "bg-alert/15 text-alert",
  outline: "bg-transparent border border-white/15 text-sand",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${TONES[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone,
  pulse,
}: {
  tone: "running" | "complete" | "alert" | "idle";
  pulse?: boolean;
}) {
  const color = {
    running: "bg-gold",
    complete: "bg-complete",
    alert: "bg-alert",
    idle: "bg-clay",
  }[tone];
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${pulse ? "anim-pulse-dot" : ""}`}
    />
  );
}
