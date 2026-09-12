# MEMORY.md

## Facts

- User runs Karfear's Softwear (Black-owned software studio); product is **Oretha AI** — uncensored, Black-powered agentic AI platform, mobile-first.
- Official Oretha logo: gold-oval portrait illustration on black (`public/oretha-logo.jpg`, from user's Downloads JPG).
- Office name: **KEVO / Karfear Enterprise Virtual Office**. AI staff: Oretha (orchestrator), Kevo (CTO), Muse (media), Booker (real estate), Sentry (security), Steward (ops).
- Brand: charcoal canvas + gold `#D4A24E` → violet `#7C3AED` gradient; Space Grotesk headings. Design system lives in `src/app/globals.css` tokens (Tailwind v4 `@theme`).

## Stack (as built)

- Next.js 15.5.25 App Router + React 19 + Tailwind v4 + framer-motion + lucide-react; phone frame max-w 32rem.
- DB: **Prisma 7** (`prisma-client` generator, output `src/generated/prisma`) + **@prisma/adapter-libsql** + `db/oretha.db` (SQLite file, absolute path resolved in `src/lib/prisma.ts`).
- Auth: email+password (bcryptjs, 12 rounds) + jose HS256 JWT in httpOnly cookie `oretha_session` (30d). Routes: `/api/auth/{register,login,logout,me}`. Guard lives in `src/app/(mobile)/layout.tsx`; signed-in users bounce `/welcome` → `/hub`.
- Routes: `(auth)/welcome|signup|signin`, `(mobile)/hub|chats|chats/[threadId]|office{,/directory,/board,/pulse}|media|guides{,/[slug]}|profile`, `/boot`.

## Environment quirks (this machine, Windows)

- **No MSVC toolchain** — `better-sqlite3` / node-gyp builds fail; use libsql prebuilds instead. Never add native-build deps.
- `npm install -D <pkg>` intermittently throws arborist `edgesOut` error; workaround: edit package.json directly, then plain `npm install`.
- `next start` on :3210 takes ~4.5s to boot — wait before curling.
- Preview screenshot compositor occasionally wedges ("no frames") while DOM stays fully interactive; verify via `preview_evaluate`/`preview_snapshot` in that case.

## Preferences

- Straight talk, no hedging. Copy is placeholder for the user to rewrite; keep structure locked.
- "Black empowerment mode" toggle and uncensored positioning are core product identity — never water down the voice.
