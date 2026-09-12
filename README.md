# Oretha AI

Uncensored, Black-powered AI OS for work and creation — mobile-first. Chats, agents, the KEVO virtual office, workflows, and a media lab in one experience.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — design tokens in `src/app/globals.css`
- **Prisma 7** + SQLite (`db/oretha.db`) via the libsql adapter — Postgres-ready schema
- **Auth**: email + password (bcrypt), JWT session cookie (jose), httpOnly
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

## Notes

- `src/generated/` and `db/` are gitignored — run `npx prisma generate` after cloning (done automatically by `prisma migrate dev`).
- Switching to Postgres/Turso later: change the datasource provider/URL, swap the libsql adapter, `prisma migrate dev`.
