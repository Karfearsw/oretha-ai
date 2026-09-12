"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  children,
  maxWidth = "28rem",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            style={{ maxWidth }}
            className="relative w-full rounded-t-[28px] border-t border-white/10 bg-sheet pb-safe-bottom-sheet"
          >
            <div className="flex items-center justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pt-3">
                <h2 className="font-display text-[20px] font-bold text-cream">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-sand transition hover:text-cream"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="px-5 pt-2">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
