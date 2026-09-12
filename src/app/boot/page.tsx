"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrethaMark } from "@/components/ui/OrethaMark";

const BOOT_LINES = [
  "Waking the muse…",
  "Syncing your office…",
  "Setting up your agents",
];

export default function BootScreen() {
  const router = useRouter();
  const [line, setLine] = useState(0);

  useEffect(() => {
    const lineTimer = setInterval(
      () => setLine((l) => (l + 1) % BOOT_LINES.length),
      1400,
    );
    const doneTimer = setTimeout(() => router.replace("/hub"), 3200);
    return () => {
      clearInterval(lineTimer);
      clearTimeout(doneTimer);
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-10">
        <div className="relative flex items-center justify-center">
          <OrethaMark size={104} />
          <div
            aria-hidden
            className="anim-spin-ring absolute inset-0 m-auto h-[128px] w-[128px] rounded-full border-[3px] border-transparent border-t-gold border-r-violet"
          />
        </div>
        <p
          key={line}
          className="anim-text-rotate font-display text-[22px] font-medium text-cream"
        >
          {BOOT_LINES[line]}
        </p>
      </div>

      <div className="absolute bottom-14 flex items-center gap-2">
        <span className="bg-gradient-to-r from-gold to-violet bg-clip-text font-display text-[17px] font-bold text-transparent">
          Oretha
        </span>
        <span className="text-[17px] font-medium text-clay">AI</span>
      </div>
    </main>
  );
}
