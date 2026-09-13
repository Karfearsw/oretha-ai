import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Mail,
  Sparkles,
} from "lucide-react";

export interface RunFeedItem {
  id: string;
  workflow: string;
  action: string;
  status: string;
  summary: string;
  at: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WorkflowRunCard({ run }: { run: RunFeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const running = run.status === "running";

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/8 bg-elevated">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition active:bg-white/4"
        aria-expanded={expanded}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            run.action === "mail_triage" ? "bg-[#38bdf8]/15 text-[#38bdf8]" : "bg-violet/15 text-violet"
          }`}
        >
          {run.action === "mail_triage" ? <Mail size={17} /> : <Sparkles size={17} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] font-bold text-cream">
            {run.workflow}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-sand">
            {running ? (
              <Loader2 size={12} className="animate-spin text-gold" />
            ) : run.status === "failed" ? (
              <XCircle size={12} className="text-alert" />
            ) : (
              <CheckCircle2 size={12} className="text-complete" />
            )}
            {running ? "is working" : run.status === "failed" ? "failed" : "finished"} ·{" "}
            {timeAgo(run.at)}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-clay transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && run.summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="border-t border-white/8 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-sand">{run.summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
