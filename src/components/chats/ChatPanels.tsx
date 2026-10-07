import { FileText, ChevronRight } from "lucide-react";
import { GuardrailCard } from "@/components/chats/GuardrailCard";

/** Guardrails segment: the three standing policy cards (static copy). */
export function GuardrailsPanel() {
  return (
    <div className="flex flex-col gap-3 pt-3">
      <GuardrailCard
        title="Censorship level"
        body="Open mode. Oretha answers straight, with legal and safety guardrails only."
        chip="Open"
        tone="gold"
      />
      <GuardrailCard
        title="Tool permissions"
        body="Agents can read connected sources and draft, but only you can approve sends, spends, and deletes."
        chip="Ask first"
        tone="violet"
      />
      <GuardrailCard
        title="Data handling"
        body="Threads stay on your devices and your cloud. Nothing is sold, nothing trains third parties."
        chip="Private"
        tone="complete"
      />
    </div>
  );
}

/** Memory segment: the five agent files, each opening the file sheet. */
export function MemoryPanel({
  agentName,
  onOpenFile,
}: {
  agentName: string;
  onOpenFile: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-3">
      <p className="text-[13px] leading-snug text-sand">
        The files that make {agentName} yours. She reads all five before
        every reply — and updates her memory as she learns you.
      </p>
      {["IDENTITY.md", "SOUL.md", "USER.md", "RULES.md", "MEMORY.md"].map(
        (f) => (
          <button
            key={f}
            onClick={() => onOpenFile(f)}
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet/20 text-[#c4b5fd]">
              <FileText size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-mono text-[14px] font-semibold text-cream">
                {f}
              </span>
              <span className="block text-[12px] text-clay">
                {f === "MEMORY.md"
                  ? "Auto-updated as you talk"
                  : f === "USER.md"
                    ? "What she knows about you"
                    : f === "RULES.md"
                      ? "The boundaries she lives by"
                      : f === "SOUL.md"
                        ? "Her voice and character"
                        : "Who she is"}
              </span>
            </span>
            <ChevronRight size={18} className="text-clay" />
          </button>
        ),
      )}
    </div>
  );
}

/** Files segment: attachments placeholder (nothing lands here yet). */
export function FilesPanel() {
  return (
    <div className="flex flex-col items-center gap-2 pt-16 text-center">
      <FileText size={28} className="text-clay" />
      <p className="text-[14px] font-semibold text-cream">No files yet</p>
      <p className="max-w-[240px] text-[12.5px] text-clay">
        Attachments and generated files from this thread will stack up here.
      </p>
    </div>
  );
}
