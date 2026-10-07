import { Chip } from "@/components/ui/Chip";

export function GuardrailCard({
  title,
  body,
  chip,
  tone,
}: {
  title: string;
  body: string;
  chip: string;
  tone: "gold" | "violet" | "complete";
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-[15px] font-bold text-cream">{title}</p>
        <Chip tone={tone}>{chip}</Chip>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-sand">{body}</p>
    </div>
  );
}
