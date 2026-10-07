import Link from "next/link";
import { X, Ellipsis, List, ShieldCheck, History, Fingerprint } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentItem } from "@/components/ui/SegmentedControl";
import { OrethaMark } from "@/components/ui/OrethaMark";

/** Which side panel the segmented control is showing. */
export type Seg = "activity" | "guardrails" | "memory" | "files";

const SEGMENTS: SegmentItem<Seg>[] = [
  { value: "activity", label: "Activity", icon: List },
  { value: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { value: "memory", label: "Memory", icon: History },
  { value: "files", label: "Files", icon: Fingerprint },
];

export function ChatHeader({
  threadTitle,
  agentName,
  busy,
  seg,
  onSegChange,
  optionsOpen,
  onOpenOptions,
}: {
  threadTitle: string | null;
  agentName: string;
  busy: boolean;
  seg: Seg;
  onSegChange: (seg: Seg) => void;
  optionsOpen: boolean;
  onOpenOptions: () => void;
}) {
  return (
    <header className="pad-safe-top sticky top-0 z-20 bg-canvas/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <Link
          href="/chats"
          aria-label="Close chat"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream"
        >
          <X size={20} />
        </Link>
        <div className="flex flex-col items-center gap-1.5">
          <OrethaMark size={52} />
          <span className="rounded-full bg-elevated px-3.5 py-1.5 text-center">
            <span className="block font-display text-[13px] font-bold leading-tight text-cream">
              {threadTitle ?? agentName}
            </span>
            <span className="block text-[11.5px] leading-tight text-sand">
              {busy ? "is working" : "is ready"}
            </span>
          </span>
        </div>
        <button
          aria-label="Chat options"
          aria-expanded={optionsOpen}
          onClick={onOpenOptions}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream transition active:scale-90"
        >
          <Ellipsis size={20} />
        </button>
      </div>
      <div className="px-4 pb-2">
        <SegmentedControl items={SEGMENTS} value={seg} onChange={onSegChange} iconOnly />
      </div>
    </header>
  );
}
