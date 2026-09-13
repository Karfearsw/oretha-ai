# Oretha AI

Uncensored, Black-powered AI OS for work and creation — mobile-first. Chats, agents, the KEVO virtual office, workflows, and a media lab in one experience.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — design tokens in `src/app/globals.css`
- **Prisma 7** + SQLite (`db/oretha.db`) via the libsql adapter — Postgres-ready schema
- **Auth**: email + password (bcrypt), JWT session cookie (jose), httpOnly
- **LLM**: provider-agnostic streaming (Meta Model API / Muse Spark by default, or any OpenAI-compatible API or Anthropic)
- **Memory**: background summarization merges durable facts into `MEMORY.md` after each exchange
- framer-motion, lucide-react

## Getting started

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET
npx prisma migrate dev       # creates db/oretha.db
npm run dev
```

Open http://localhost:3000 → you'll land on `/welcome` to create an account.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm start` | Serve the production build |
| `npx prisma studio` | Browse the database |

## Structure

```
src/
  app/
    (auth)/        welcome · signup · signin
    (mobile)/      hub · chats · office · media · guides · profile
    api/auth/      register · login · logout · me
    boot/          splash screen
  components/      ui · layout · hub · chats · office · auth
  lib/             prisma · auth · types · mock data
  generated/       prisma client (do not edit; gitignored)
```

## Deploying (Vercel + Turso)

1. Create a Turso database ([turso.tech](https://turso.tech)) and copy its URL + auth token.
2. Push to GitHub, import the repo on [Vercel](https://vercel.com).
3. Add env vars in Vercel → Settings → Environment Variables:
   - `DATABASE_URL` = `libsql://your-db.turso.io`
   - `DATABASE_AUTH_TOKEN` = your Turso token
   - `AUTH_SECRET` = a long random string
   - `LLM_API_KEY` = your OpenAI (or compatible) key — see **Wiring Oretha's voice** below
4. Apply the schema once from your machine:
   `node scripts/apply-migrations-turso.mjs "libsql://..." "your-token"` — applies the migration SQL directly and records it in `_prisma_migrations` exactly as `prisma migrate deploy` would (the Prisma 7 CLI does not accept remote `libsql://` URLs for migrations on all setups). Verify afterwards with `node scripts/verify-turso.mjs "libsql://..." "your-token"`.
5. Deploy. `prisma generate` runs automatically during the build.

## Wiring Oretha's voice (LLM)

The chat is a real streaming completion call. Configure it with env vars — no code changes needed for any OpenAI-compatible provider:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `meta` (default — Meta Model API / Muse Spark), `openai`, or `anthropic` |
| `LLM_API_KEY` | Provider API key — required for chat. For Meta: create one at [dev.meta.ai](https://dev.meta.ai) (format `LLM\|…\|…`) |
| `LLM_MODEL` | e.g. `muse-spark-1.3` (Meta default), `gpt-4o-mini`, `claude-3-5-haiku-latest` |
| `LLM_BASE_URL` | Optional override — Meta defaults to `https://api.meta.ai/v1`; point at Groq, Together, OpenRouter, or local Ollama |

Her system prompt is composed per request from your five agent files (IDENTITY → SOUL → USER → RULES → MEMORY). After each exchange, a background call extracts durable facts and merges them into `MEMORY.md` — she learns you as you talk.

With no key set, the UI degrades gracefully: the composer shows a setup hint instead of failing silently.

## Notes

- `src/generated/` and `db/` are gitignored — they're rebuilt via `prisma generate` / `prisma migrate dev` (both wired into npm scripts).
- Switching databases: change `DATABASE_URL` — the Prisma schema and libsql adapter already support remote libsql/Postgres-style URLs.
