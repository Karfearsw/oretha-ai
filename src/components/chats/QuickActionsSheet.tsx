import { Sheet } from "@/components/ui/Sheet";
import { Loader2, Mail, NotebookPen, KanbanSquare, SquarePlus } from "lucide-react";

/** The "+" sheet: four actions, each wired to a production system. */
export function QuickActionsSheet({
  open,
  onClose,
  mailBusy,
  onCheckMail,
  onPinToMemory,
  onOpenBoard,
  onNewChat,
}: {
  open: boolean;
  onClose: () => void;
  mailBusy: boolean;
  onCheckMail: () => void;
  onPinToMemory: () => void;
  onOpenBoard: () => void;
  onNewChat: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Quick actions">
      <div className="flex flex-col gap-2.5 pb-4">
        <button
          onClick={() => {
            onClose();
            onCheckMail();
          }}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
            {mailBusy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">Check the mailroom</span>
            <span className="block text-[12px] text-sand">Sync inbox now, triage new email to the board</span>
          </span>
        </button>

        <button
          onClick={() => {
            onClose();
            onPinToMemory();
          }}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet/20 text-[#c4b5fd]">
            <NotebookPen size={18} />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">Pin to her memory</span>
            <span className="block text-[12px] text-sand">Save the typed line into MEMORY.md permanently</span>
          </span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenBoard();
          }}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
            <KanbanSquare size={18} />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">Open task board</span>
            <span className="block text-[12px] text-sand">See what the crew picked up from email</span>
          </span>
        </button>

        <button
          onClick={() => {
            onClose();
            onNewChat();
          }}
          className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
            <SquarePlus size={18} />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-cream">New chat</span>
            <span className="block text-[12px] text-sand">Fresh thread, same memory</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}
