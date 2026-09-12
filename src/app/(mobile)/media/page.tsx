"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Clapperboard,
  Music,
  Layers,
  Wand2,
  RefreshCw,
  Heart,
  Download,
} from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentItem } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { OUTPUTS } from "@/lib/mock/content";

type Mode = "images" | "video" | "music" | "social";

const MODES: SegmentItem<Mode>[] = [
  { value: "images", label: "Images", icon: ImageIcon },
  { value: "video", label: "Video", icon: Clapperboard },
  { value: "music", label: "Music", icon: Music },
  { value: "social", label: "Social", icon: Layers },
];

const CREATIVES = [
  "Cover Art Designer",
  "Clip Editor",
  "Hook Writer",
  "Thumbnail Architect",
];

export default function MediaLabPage() {
  const [mode, setMode] = useState<Mode>("images");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1600);
  };

  const current = OUTPUTS[0];

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Media Lab
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Make the thing. Muse and the crew are standing by.
        </p>
      </header>

      <SegmentedControl items={MODES} value={mode} onChange={setMode} />

      <section aria-label="Workspace canvas" className="flex flex-col gap-3">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-elevated">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="gen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="anim-spin-ring h-12 w-12 rounded-full border-[3px] border-transparent border-t-gold border-r-violet" />
                <p className="text-[13px] text-sand">Muse is cooking…</p>
              </motion.div>
            ) : (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${current.gradient}`}
              >
                <div className="text-center">
                  <Wand2 size={30} className="mx-auto text-canvas/70" />
                  <p className="mt-2 font-display text-[17px] font-bold text-canvas">
                    {current.title}
                  </p>
                  <p className="text-[12px] text-canvas/70">{current.meta}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute right-3 top-3 flex gap-2">
            <button
              aria-label="Favorite"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/70 text-cream backdrop-blur"
            >
              <Heart size={16} />
            </button>
            <button
              aria-label="Download"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/70 text-cream backdrop-blur"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <RefreshCw size={14} /> Variations
          </Button>
          <Button variant="ghost" size="sm">
            1:1
          </Button>
          <Button variant="ghost" size="sm">
            9:16
          </Button>
        </div>
      </section>

      <section aria-label="Prompt" className="flex flex-col gap-2.5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="Describe it — mood, palette, references…"
          className="w-full resize-none rounded-[18px] border border-white/10 bg-elevated p-4 text-[15px] text-cream outline-none placeholder:text-clay"
        />
        <Button
          variant="gradient"
          size="lg"
          onClick={generate}
          loading={generating}
          disabled={!prompt.trim()}
        >
          <Wand2 size={18} /> Generate
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
              onClick={() => setPrompt((p) => (p ? `${p} — style: ${c}` : `${c}: `))}
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
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {OUTPUTS.map((o) => (
            <div
              key={o.id}
              className="w-[120px] shrink-0 overflow-hidden rounded-[16px] border border-white/8"
            >
              <div className={`flex h-[120px] items-center justify-center bg-gradient-to-br ${o.gradient}`}>
                {o.kind === "image" && <ImageIcon size={22} className="text-canvas/60" />}
                {o.kind === "video" && <Clapperboard size={22} className="text-canvas/60" />}
                {o.kind === "music" && <Music size={22} className="text-canvas/60" />}
                {o.kind === "social" && <Layers size={22} className="text-canvas/60" />}
              </div>
              <div className="bg-elevated p-2.5">
                <p className="truncate text-[12px] font-semibold text-cream">
                  {o.title}
                </p>
                <p className="truncate text-[10.5px] text-clay">{o.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
