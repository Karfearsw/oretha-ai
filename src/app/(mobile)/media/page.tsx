"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OrethaIcon, type OrethaIconName } from "@/components/brand/OrethaIcon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentItem } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";

type Mode = "images" | "video" | "music" | "social";

const MODES: SegmentItem<Mode>[] = [
  { value: "images", label: "Images", icon: "images" as OrethaIconName },
  { value: "video", label: "Video", icon: "video" as OrethaIconName },
  { value: "music", label: "Music", icon: "music" as OrethaIconName },
  { value: "social", label: "Social", icon: "social" as OrethaIconName },
];

const MODE_COPY: Record<Mode, string> = {
  images: "image rendering",
  video: "video generation",
  music: "music generation",
  social: "social pack rendering",
};

const CREATIVES = [
  "Hook Writer",
  "Caption Studio",
  "Cover Concept",
  "Thumbnail Architect",
];

export default function MediaLabPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("images");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);

  /* Real path today: your text agents. The prompt becomes a real chat
   * thread where the LLM actually works on it. Pixel/video/music
   * rendering lights up when a generation provider key is added. */
  const sendToCrew = async () => {
    if (!prompt.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/threads", { method: "POST" });
      const data = await res.json();
      if (data?.thread?.id) {
        const q = encodeURIComponent(prompt.trim());
        router.push(`/chats/${data.thread.id}?prompt=${q}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Media Lab
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Make the thing. The crew works in text today; pixels are next.
        </p>
      </header>

      <SegmentedControl items={MODES} value={mode} onChange={setMode} />

      <section aria-label="Workspace canvas" className="flex flex-col gap-3">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-elevated">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 px-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                <OrethaIcon name="media" size={24} tone="gold" active glow />
              </span>
              <p className="font-display text-[15px] font-bold text-cream">
                {MODE_COPY[mode]} needs a generation provider
              </p>
              <p className="text-[12.5px] leading-snug text-sand">
                Bring an image/video/audio key and renders will appear right
                here. Your agents can already write, concept, and plan in chat
                — that path is live below.
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section aria-label="Prompt" className="flex flex-col gap-2.5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe it — mood, palette, references, the caption, the hook…"
          className="w-full resize-none rounded-[18px] border border-white/10 bg-elevated p-4 text-[15px] text-cream outline-none placeholder:text-clay"
        />
        <Button
          variant="gradient"
          size="lg"
          onClick={sendToCrew}
          loading={sending}
          disabled={!prompt.trim()}
        >
          <OrethaIcon name="media" size={18} tone="gold" /> Send to the crew
        </Button>
      </section>

      <section aria-label="Creative agents">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Creative crew
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {CREATIVES.map((c) => (
            <button
              key={c}
              onClick={() =>
                setPrompt((p) => (p ? `${p} — angle: ${c}` : `${c}: `))
              }
              className="shrink-0 rounded-full border border-violet/40 bg-violet/15 px-3.5 py-2 text-[12.5px] font-semibold text-[#c4b5fd] transition active:scale-[0.97]"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="History">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Recent outputs
        </h2>
        <div className="flex items-center gap-3 rounded-[16px] border border-dashed border-white/10 p-5">
          <OrethaIcon name="guides" size={18} tone="gold" />
          <p className="text-[12.5px] leading-snug text-clay">
            Nothing rendered yet. Connect a generation provider and every
            output collects here with its prompt — replayable and remixable.
          </p>
        </div>
      </section>
    </main>
  );
}
