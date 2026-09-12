"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, SquarePen, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FileSheet({
  open,
  filename,
  content,
  onClose,
}: {
  open: boolean;
  filename: string;
  content: string;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  // Re-sync the draft each time the sheet opens (content may differ per file)
  useEffect(() => {
    if (open) {
      setDraft(content);
      setEditing(false);
    }
  }, [open, content]);

  const close = () => {
    setEditing(false);
    setDraft(content);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex max-w-[32rem] flex-col bg-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-safe-top">
            <button
              onClick={close}
              aria-label="Close file"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream"
            >
              <ChevronDown size={20} />
            </button>
            <span className="font-mono text-[17px] font-semibold tracking-wide text-cream">
              {filename}
            </span>
            <div className="flex h-11 items-center gap-2 rounded-full bg-elevated px-1">
              <button
                onClick={() => setEditing((e) => !e)}
                aria-label={editing ? "Done editing" : "Edit file"}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${editing ? "bg-gold text-canvas" : "text-cream"}`}
              >
                <SquarePen size={17} />
              </button>
              <button
                aria-label="More options"
                className="flex h-9 w-9 items-center justify-center rounded-full text-cream"
              >
                <Ellipsis size={17} />
              </button>
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
            {editing ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-full min-h-[50dvh] w-full resize-none bg-transparent text-[16px] leading-relaxed text-cream outline-none"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-body text-[16px] leading-relaxed text-cream">
                {draft}
              </pre>
            )}
          </div>

          {editing && (
            <div className="flex gap-3 px-5 pb-safe-bottom-sheet pt-2">
              <Button variant="ghost" size="md" className="flex-1" onClick={close}>
                Discard
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                Save
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
