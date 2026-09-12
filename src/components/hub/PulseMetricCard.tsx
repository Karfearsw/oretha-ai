import Link from "next/link";
import { Sparkline } from "@/components/ui/charts";
import type { PulseMetric } from "@/lib/types";

export function PulseMetricCard({ metric }: { metric: PulseMetric }) {
  return (
    <Link
      href="/office/pulse"
      className="flex w-[148px] shrink-0 flex-col gap-2 rounded-[16px] border border-white/8 bg-elevated p-3.5 transition active:scale-[0.97]"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-clay">
        {metric.label}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="font-display text-[22px] font-bold leading-none text-cream">
          {metric.value}
        </span>
        <Sparkline data={metric.spark} up={metric.trend === "up"} />
      </span>
      <span
        className={`text-[11px] font-semibold ${metric.trend === "up" ? "text-complete" : "text-alert"}`}
      >
        {metric.delta} vs last week
      </span>
    </Link>
  );
}
