import { Sheet } from "@/components/ui/Sheet";
import { Pencil, Volume2, VolumeX, Eraser, Trash2 } from "lucide-react";

/** The ⋯ header sheet: rename, speak-aloud toggle, clear history, delete. */
export function ThreadOptionsSheet({
  open,
  onClose,
  renaming,
  renameText,
  onRenameTextChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  speakReplies,
  onToggleSpeakReplies,
  onClear,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  renaming: boolean;
  renameText: string;
  onRenameTextChange: (value: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  speakReplies: boolean;
  onToggleSpeakReplies: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Chat options">
      <div className="flex flex-col gap-2.5 pb-4">
        {renaming ? (
          <div className="flex flex-col gap-2 rounded-[16px] border border-gold/30 bg-gold/5 p-4">
            <input
              autoFocus
              value={renameText}
              onChange={(e) => onRenameTextChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSaveRename()}
              placeholder="Chat name"
              className="w-full rounded-[12px] border border-white/10 bg-canvas p-3 text-[15px] text-cream outline-none placeholder:text-clay"
            />
            <div className="flex gap-2">
              <button
                onClick={onSaveRename}
                className="flex-1 rounded-[12px] bg-gradient-to-br from-gold to-violet py-2.5 text-[13.5px] font-bold text-canvas"
              >
                Save
              </button>
              <button
                onClick={onCancelRename}
                className="flex-1 rounded-[12px] border border-white/10 py-2.5 text-[13.5px] font-semibold text-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onStartRename}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
              <Pencil size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Rename chat</span>
              <span className="block text-[12px] text-sand">Give this thread a name you'll find later</span>
            </span>
          </button>
        )}

        <button
          onClick={onToggleSpeakReplies}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${speakReplies ? "bg-gold/15 text-gold" : "bg-white/10 text-cream"}`}>
            {speakReplies ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </span>
          <span className="flex-1">
            <span className="block text-[14.5px] font-semibold text-cream">Speak replies aloud</span>
            <span className="block text-[12px] text-sand">Read her answers with the browser's voice</span>
          </span>
          <span className={`h-6 w-10 rounded-full p-0.5 transition ${speakReplies ? "bg-gold" : "bg-white/15"}`}>
            <span className={`block h-5 w-5 rounded-full bg-canvas transition ${speakReplies ? "translate-x-4" : ""}`} />
          </span>
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
            <Eraser size={18} />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">Clear conversation</span>
            <span className="block text-[12px] text-sand">Wipe the history, keep the chat</span>
          </span>
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-3.5 rounded-[16px] border border-alert/30 bg-alert/10 p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-alert/20 text-alert">
            <Trash2 size={18} />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">Delete chat</span>
            <span className="block text-[12px] text-sand">Gone for good — thread and history</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}
