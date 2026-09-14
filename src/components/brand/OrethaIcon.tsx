"use client";

import { useId } from "react";

export type OrethaIconName =
  | "chats"
  | "office"
  | "workflows"
  | "media"
  | "guides"
  | "hub"
  | "profile"
  | "pulse"
  | "mail"
  | "board"
  | "connectors"
  | "directory"
  | "inbox"
  | "images"
  | "video"
  | "music"
  | "social";

type Tone = "gold" | "violet" | "cream" | "clay";

const COLORS: Record<Tone, string> = {
  gold: "var(--color-gold)",
  violet: "#a78bfa",
  cream: "var(--color-cream)",
  clay: "var(--color-clay)",
};

export interface OrethaIconProps {
  name: OrethaIconName;
  size?: number;
  tone?: Tone;
  active?: boolean;
  glow?: boolean;
  className?: string;
}

function Glyph({ name }: { name: OrethaIconName }) {
  switch (name) {
    case "hub":
      return <><circle cx="12" cy="4.6" r="2.6" /><path d="M12 9.5v11.9M6.2 13.2h11.6M8.4 9.8C6 11.6 5.6 15.2 6.9 17.4M15.6 9.8c2.4 1.8 2.8 5.4 1.5 7.6" /></>;
    case "chats":
      return <><path d="M4.2 5.6h15.6v10.2H9.4L4.2 20zM8.6 9.2h6.8M8.6 12.2H13" /><path d="m17.5 18.5 3.5 1.7-2  .8" /></>;
    case "office":
      return <><path d="M4.5 8.5h15M6.5 8.5V20h11V8.5M4.5 4.5h15v4M12 4.5v4M10 20v-4.8h4V20M8.8 11.6h1.4M13.8 11.6h1.4" /></>;
    case "workflows":
      return <><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="6" r="2.2" /><circle cx="12" cy="12" r="2.6" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="18" r="2.2" /><path d="M8.2 6h7.6M8.2 18h7.6M7.5 7.5 10 10.2M14 10.2l2.5-2.7M7.5 16.5l2.5-2.7M14 13.8l2.5 2.7" /></>;
    case "media":
      return <><path d="M5 20 12.2 11.2M14 8.5 16.5 6M15.5 12.5C18.5 12 21 9.5 21 6.8M8.5 8.5l1.8 1.8M4.5 14.5l1.8 1.8M14.5 4.5l1.8 1.8" /><circle cx="18.2" cy="4.8" r="1.6" /></>;
    case "guides":
      return <><path d="M6 3.8h9.5L19 7.5v12.7H6zM15.5 3.8v3.7H19M9 11.2h7M9 14.2h7M9 17.2h4" /><circle cx="16.8" cy="17" r="1" /></>;
    case "profile":
      return <><circle cx="12" cy="8.4" r="3.6" /><path d="M4.8 20.5c.8-4.9 3.6-6.9 7.2-6.9s6.4 2 7.2 6.9M8.2 4.2c1-.8 2.4-1.3 3.8-1.3s2.8.5 3.8 1.3" /></>;
    case "pulse":
      return <><circle cx="12" cy="12" r="8.6" /><path d="M4.4 12.4H8l1.8-3.8 2.6 6.8 1.8-3h5.4" /></>;
    case "mail":
    case "inbox":
      return <><rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.4" /><path d="m4.4 7.4 7.6 5.8 7.6-5.8M15.5 18.4l5.5 1.8" /></>;
    case "board":
      return <><rect x="3.6" y="4.4" width="16.8" height="15.2" rx="2.6" /><path d="M9.2 4.4v15.2M14.8 4.4v15.2M10.6 12h2.8" /></>;
    case "connectors":
      return <><circle cx="8.6" cy="12" r="5.2" /><circle cx="15.4" cy="12" r="5.2" /></>;
    case "directory":
      return <><circle cx="12" cy="7" r="3" /><circle cx="5.4" cy="9" r="2.2" /><circle cx="18.6" cy="9" r="2.2" /><path d="M6.8 19.5c.6-4.1 2.6-5.7 5.2-5.7s4.6 1.6 5.2 5.7M2.8 17c.5-2.8 1.7-4 3.4-4.2M21.2 17c-.5-2.8-1.7-4-3.4-4.2" /></>;
    case "images":
      return <><rect x="3.6" y="4.4" width="16.8" height="15.2" rx="2.6" /><circle cx="9" cy="9.4" r="1.7" /><path d="m5 18.5 5.4-5.5 3.6 3.5 2.5-2.5 2.5 2.5" /></>;
    case "video":
      return <><path d="M3.8 9h16.4v10.4H3.8zM3.8 9l1.6-4.4h14.8L18.6 9M9.6 4.6 8 9M15.4 4.6 13.8 9" /><path d="m11 13 3.6 2.2-3.6 2.2z" /></>;
    case "music":
      return <><circle cx="7.2" cy="18" r="2.6" /><circle cx="17.4" cy="16.2" r="2.6" /><path d="M9.8 18V6.2L20 4.4v11.8M9.8 9.6 20 7.8" /></>;
    case "social":
      return <><path d="m12 3.4 8.6 4.6-8.6 4.6L3.4 8zM3.4 13l8.6 4.6 8.6-4.6M3.4 17.4l8.6 4.6 8.6-4.6" /></>;
  }
}

export function OrethaIcon({ name, size = 22, tone = "gold", active = false, glow = false, className = "" }: OrethaIconProps) {
  const id = useId();
  const color = COLORS[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {glow && <defs><filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#7c3aed" /></filter></defs>}
      <g stroke={color} strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" filter={glow ? `url(#${id}-glow)` : undefined}>
        <Glyph name={name} />
      </g>
    </svg>
  );
}
