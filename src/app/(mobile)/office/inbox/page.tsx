"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  RefreshCw,
  ListPlus,
  Archive,
  Check,
  UserPlus,
  Loader2,
  AtSign,
} from "lucide-react";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface EmailRow {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  triaged: boolean;
  action: string | null;
  taskTitle: string | null;
}

interface MailboxRow {
  id: string;
  address: string;
  displayName: string | null;
  lastSyncAt: string | null;
  emails: EmailRow[];
}

type Filter = "all" | "task" | "reply" | "archive";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "reply", label: "Drafts" },
  { value: "archive", label: "Filed" },
];

export default function InboxPage() {
  const [mailbox, setMailbox] = useState<MailboxRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/mail/sync");
    if (res.ok) {
      const data = await res.json();
      setMailbox(data.mailboxes[0] ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/mail/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const r = data.results?.[0];
        setNotice(
          r
            ? `${r.triaged} new · ${r.tasks} task${r.tasks === 1 ? "" : "s"} on the board`
            : "Nothing new",
        );
        await load();
      } else {
        setNotice(data?.error ?? "Sync failed");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function connect() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/mail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setApiKey("");
        await load();
      } else {
        setNotice(data?.error ?? "Couldn't connect");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function makeTask(emailId: string) {
    setNotice(null);
    const res = await fetch("/api/mail/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId, action: "task" }),
    });
    if (res.ok) {
      setNotice("Task created on the board");
      await load();
    } else {
      const data = await res.json().catch(() => null);
      setNotice(data?.error ?? "Couldn't create the task");
    }
  }

  const emails = mailbox?.emails ?? [];
  const shown = emails.filter((e) => filter === "all" || e.action === filter);
  const untriaged = emails.filter((e) => !e.triaged).length;
  const tasks = emails.filter((e) => e.action === "task").length;

  return (
    <main className="pad-safe-top flex flex-col gap-4 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">Inbox</h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Your agent&apos;s own mailroom. New mail becomes tasks, drafts, or
          gets filed.
        </p>
      </header>

      <OfficeSubTabs />

      {loading ? (
        <p className="py-10 text-center text-[13px] text-clay">Loading…</p>
      ) : !mailbox ? (
        <section className="flex flex-col gap-4 rounded-[18px] border border-white/8 bg-elevated p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold/12 text-gold">
            <Mail size={22} />
          </span>
          <div>
            <p className="font-display text-[16px] font-bold text-cream">
              Connect her mailroom
            </p>
            <p className="mt-1 text-[13px] leading-snug text-sand">
              Paste an AgentMail API key (from{" "}
              <a
                href="https://www.agentmail.to"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gold underline decoration-gold/40"
              >
                agentmail.to
              </a>
              ) and she&apos;ll get her own inbox — not yours. It stays
              encrypted here.
            </p>
          </div>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            placeholder="am_…"
            spellCheck={false}
            className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
          />
          <Button variant="primary" onClick={connect} disabled={connecting}>
            <span className="flex items-center gap-2">
              {connecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <AtSign size={16} />
              )}
              {connecting ? "Provisioning…" : "Connect & create her inbox"}
            </span>
          </Button>
          {notice && <p className="text-[12.5px] text-alert">{notice}</p>}
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between rounded-[18px] border border-white/8 bg-elevated p-4">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-cream">
                {mailbox.address}
              </p>
              <p className="text-[12px] text-clay">
                {mailbox.lastSyncAt
                  ? `Last sync ${new Date(mailbox.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "Never synced"}
                {untriaged > 0 && ` · ${untriaged} untriaged`}
              </p>
            </div>
            <button
              onClick={sync}
              disabled={syncing}
              aria-label="Sync inbox"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
            </button>
          </section>

          <section className="flex items-center gap-3 rounded-[16px] border border-gold/25 bg-gradient-to-br from-gold/10 to-violet/10 p-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-[15px] font-bold text-canvas">
              M
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-cream">
                Mailroom · KEVO employee
              </p>
              <p className="text-[12px] text-clay">
                {tasks} task{tasks === 1 ? "" : "s"} on the board · owns this
                inbox
              </p>
            </div>
            <Link
              href="/office/directory"
              className="flex items-center gap-1 text-[12px] font-semibold text-gold"
            >
              <UserPlus size={13} /> Card
            </Link>
          </section>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold ${
                  filter === f.value
                    ? "bg-gold text-canvas"
                    : "bg-elevated text-sand"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {notice && (
            <p className="rounded-[12px] border border-complete/30 bg-complete/10 px-3.5 py-2.5 text-[12.5px] text-complete">
              {notice}
            </p>
          )}

          <section className="flex flex-col gap-2.5">
            {shown.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-white/10 p-6 text-center text-[12.5px] text-clay">
                {emails.length === 0
                  ? "No mail yet — email her inbox and hit sync."
                  : "Nothing under this filter"}
              </p>
            ) : (
              shown.map((e) => (
                <article
                  key={e.id}
                  className="flex flex-col gap-2 rounded-[16px] border border-white/8 bg-elevated p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-clay">{e.from}</p>
                      <p className="truncate text-[14px] font-semibold text-cream">
                        {e.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-clay">
                      {new Date(e.receivedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {e.preview && (
                    <p className="line-clamp-2 text-[12.5px] leading-snug text-sand">
                      {e.preview}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {e.triaged ? (
                      <>
                        <Chip tone="complete">
                          <Check size={11} /> {e.action}
                        </Chip>
                        {e.action === "task" && e.taskTitle && (
                          <Chip tone="gold">{e.taskTitle}</Chip>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => makeTask(e.id)}
                          className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/12 px-3 py-1.5 text-[12px] font-semibold text-gold transition active:scale-95"
                        >
                          <ListPlus size={12} /> Make task
                        </button>
                        <button
                          onClick={() =>
                            setNotice("Archive is coming soon — triage runs it for now.")
                          }
                          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[12px] font-medium text-sand transition active:scale-95"
                        >
                          <Archive size={12} /> Archive
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
