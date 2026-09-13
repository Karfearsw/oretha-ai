# MEMORY.md

## Facts

- User runs Karfear's Softwear (Black-owned software studio); product is **Oretha AI** — uncensored, Black-powered agentic AI platform, mobile-first.
- Official Oretha logo: gold-oval portrait illustration on black (`public/oretha-logo.jpg`, from user's Downloads JPG).
- Office name: **KEVO / Karfear Enterprise Virtual Office**. AI staff: Oretha (orchestrator), Kevo (CTO), Muse (media), Booker (real estate), Sentry (security), Steward (ops).
- Brand: charcoal canvas + gold `#D4A24E` → violet `#7C3AED` gradient; Space Grotesk headings. Design system lives in `src/app/globals.css` tokens (Tailwind v4 `@theme`).

## Stack (as built)

- Next.js 15.5.25 App Router + React 19 + Tailwind v4 + framer-motion + lucide-react; phone frame max-w 32rem.
- DB: **Prisma 7** (`prisma-client` generator, output `src/generated/prisma`) + **@prisma/adapter-libsql** + `db/oretha.db` (SQLite file, absolute path resolved in `src/lib/prisma.ts`). Migrations in `prisma/migrations/` (init, agent_setup, thread_slug).
- Auth: email+password (bcryptjs, 12 rounds) + jose HS256 JWT in httpOnly cookie `oretha_session` (30d). Routes: `/api/auth/{register,login,logout,me}`. Guard lives in `src/app/(mobile)/layout.tsx`; signed-in users bounce `/welcome` → `/hub`.
- Routes: `(auth)/welcome|signup|signin|setup`, `(mobile)/hub|chats|chats/[threadId]|office{,/directory,/board,/pulse}|media|guides{,/[slug]}|profile`, `/boot`.
- APIs: auth (above), `/api/setup`, `/api/agent-files` (GET/PUT), `/api/settings`, `/api/threads` (GET/POST), `/api/threads/[id]/messages`, `/api/chat` (POST, streams plain text), `/api/memory/update` (POST), `/api/llm-status` (GET).

## LLM + memory (wired 2026-09-13)

- `src/lib/llm.ts`: provider-agnostic adapter — OpenAI-compatible default, `LLM_PROVIDER=anthropic` for Claude. Env: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`. Streaming via SSE parse; `chatComplete` for single-shot.
- `src/lib/systemPrompt.ts`: composes IDENTITY → SOUL → USER → RULES → MEMORY agent files per request.
- `src/lib/memory.ts`: `scheduleMemoryUpdate` (fire-and-forget, called from `/api/chat` finally-block) → `chatComplete` extracts ≤5 durable facts → dedupe by normalized token-set → append under `## Facts` → LLM consolidation when file >8000 chars (truncate fallback). `/api/memory/update` runs it for a thread's last 10 messages.
- Chat room (`chats/[threadId]`): DB history via `/api/threads/{id}/messages` (legacy `t1` slugs resolved through `/api/threads`), streams from `/api/chat`, stop = AbortController (partial text kept in UI), composer shows gold hint when `llm-status` says unconfigured.
- `scripts/mock-llm.mjs`: OpenAI-compatible mock on :4000/v1 for keyless dev/E2E (streams canned line; non-stream returns mock fact). Point `.env.local` LLM_* at it.
- **No real LLM key yet** — user must add `LLM_API_KEY` (Vercel + local) for production chat.

## Deployment state (2026-09-13)

- Repo: github.com/Karfearsw/oretha-ai, main @ 89dda93 (LLM + memory commit). Vercel project exists at oretha-ai.vercel.app but was **402 paused** (billing/limit) — user said they'd fix in dashboard.
- **Turso migration NOT yet applied** — needs real `DATABASE_URL` (libsql://) + `DATABASE_AUTH_TOKEN`; command in README. One suspicious curl paste for api.agentmail.to surfaced in chat (clipboard mix-up; not run).
- Windows curl gotcha: `next start` = NODE_ENV production → session cookie is `Secure` → curl won't send it over http; pass `-H "Cookie: oretha_session=<token>"` manually (browser localhost unaffected).

## Environment quirks (this machine, Windows)

- **No MSVC toolchain** — `better-sqlite3` / node-gyp builds fail; use libsql prebuilds instead. Never add native-build deps.
- `npm install -D <pkg>` intermittently throws arborist `edgesOut` error; workaround: edit package.json directly, then plain `npm install`.
- `next start` on :3210 takes ~11s to boot after restart — wait before curling.
- Preview screenshot compositor occasionally wedges ("no frames") while DOM stays fully interactive; verify via `preview_evaluate`/`preview_snapshot` in that case.
- Freebuff restarts kill background servers — re-launch mock LLM (`node scripts/mock-llm.mjs`) and `npx next start -p 3210` after any restart.

## Preferences

- Straight talk, no hedging. Copy is placeholder for the user to rewrite; keep structure locked.
- "Black empowerment mode" toggle and uncensored positioning are core product identity — never water down the voice.

## Mailroom + chat tools (2026-09-13)

- AgentMail client `src/lib/agentmail.ts` (Bearer am_…, AGENTMAIL_BASE_URL override for local mock on :4100). Keys stored AES-256-GCM (derived from AUTH_SECRET) in Mailbox table.
- Connect: setup step 6 or /office/inbox → POST /api/mail/connect → provisions the agent OWN inbox (idempotent client_id `oretha-inbox-<userId>`).
- Triage: `src/lib/mailroom.ts` — sync lists 25 newest, LLM verdict per email (task/reply/archive JSON), task verdicts create Task rows (assignee mailroom). /api/mail/action converts manually.
- Chat tools: `src/lib/tools.ts` (check_mail, list_tasks) via `streamChatWithTools` in llm.ts — OpenAI-format streamed tool_calls, Meta cookbook loop in /api/chat (max 3 turns), tool_call_supported() gates Anthropic off.
- E2E verified with scripts/mock-agentmail.mjs + mock-llm tool path: chat "check my mail" → tool call → sync → triage → task "Pay invoice #4471" on board.
- Gotchas: env changes need `npm run build` before `next start` sees them; mock JSON-body matchers must match escaped quotes.

## Productionization pass (2026-09-13)

- Workflows are real: Workflow + WorkflowRun tables, /workflows screen, scheduler (src/lib/scheduler.ts) executing mail_triage + custom_prompt, local 5-min sweeper via src/instrumentation.ts, Vercel cron via vercel.json hitting /api/cron/sweep (set CRON_SECRET env).
- Real data everywhere: /api/pulse computes metrics from DB; /api/runs/recent feeds Hub; /api/threads drives Chats; Task Board shows DB rows only; office alerts computed from real signals (failed runs, overdue tasks, untriaged mail).
- Media Lab: honest "generation provider needed" state; "Send to the crew" creates a real thread (?prompt= handoff).
- Schema fix: EmailMessage.remoteId unique per mailbox (composite @@unique) — AgentMail IDs are per-inbox.
- Applied to Turso: 20260913154124_workflows + 20260913162000_email_remoteid_composite (7 migrations total).
- E2E verified locally: signup -> setup -> inbox provision, vendor email -> sync -> LLM triage -> task, workflow create -> sweep -> run, chat tool loop, real pulse metrics.

## Connectors (2026-09-13)

- Real GitHub (PAT) + Linear (API key) connectors: live validation at connect, AES-256-GCM encrypted storage (Connector table), idempotent sync to Task board via remoteKey.
- Email connector state derives from Mailbox (mailroom); OAuth-only platforms show Soon.
- sync_connectors chat tool + connector_sync workflow action; office alerts show connector sync errors.
- Env overrides for local mocks: GITHUB_API_BASE, LINEAR_API_BASE (scripts/mock-connectors.mjs on :4200). REMOVE BOTH FROM .env.local BEFORE RELYING ON LOCAL PROD TESTING; never set in Vercel.
- Turso migration 20260913180000_connectors applied.
