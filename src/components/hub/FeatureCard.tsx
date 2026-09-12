import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface FeatureCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  full?: boolean;
}

export function FeatureCard({
  title,
  desc,
  icon: Icon,
  href,
  badge,
  full,
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-3 rounded-[20px] border border-white/8 bg-elevated p-4 transition active:scale-[0.97] ${full ? "col-span-2 flex-row items-center" : ""}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-gold/25 to-violet/25 text-gold ${full ? "h-12 w-12" : ""}`}
      >
        <Icon size={22} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-[15px] font-bold text-cream">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[12.5px] leading-snug text-sand">{desc}</span>
      </span>
    </Link>
  );
}
