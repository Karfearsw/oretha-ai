import type { AgentStatus } from "@/lib/types";

const GRADS: Record<string, string> = {
  oretha: "from-gold to-violet",
  kevo: "from-[#38bdf8] to-violet",
  muse: "from-gold to-[#f472b6]",
  booker: "from-[#38bdf8] to-gold",
  sentry: "from-alert to-violet",
  steward: "from-complete to-gold",
};

const RING: Record<AgentStatus, string> = {
  working: "ring-2 ring-gold ring-offset-2 ring-offset-canvas",
  online: "ring-2 ring-complete/60 ring-offset-2 ring-offset-canvas",
  idle: "ring-1 ring-white/15 ring-offset-2 ring-offset-canvas",
};

export function AgentAvatar({
  agentId,
  name,
  size = 40,
  status,
}: {
  agentId: string;
  name: string;
  size?: number;
  status?: AgentStatus;
}) {
  const initials = name.slice(0, 1).toUpperCase();
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${GRADS[agentId] ?? "from-sand to-clay"} ${status ? RING[status] : ""}`}
    >
      <span
        className="font-display font-bold text-canvas"
        style={{ fontSize: size * 0.42 }}
      >
        {initials}
      </span>
    </span>
  );
}
