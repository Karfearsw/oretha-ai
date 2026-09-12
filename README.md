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

## Deploying (Vercel + Turso)

1. Create a Turso database ([turso.tech](https://turso.tech)) and copy its URL + auth token.
2. Push to GitHub, import the repo on [Vercel](https://vercel.com).
3. Add env vars in Vercel → Settings → Environment Variables:
   - `DATABASE_URL` = `libsql://your-db.turso.io`
   - `DATABASE_AUTH_TOKEN` = your Turso token
   - `AUTH_SECRET` = a long random string
4. Apply the schema once from your machine:
   `DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npx prisma migrate deploy`
5. Deploy. `prisma generate` runs automatically during the build.

## Notes

- `src/generated/` and `db/` are gitignored — they're rebuilt via `prisma generate` / `prisma migrate dev` (both wired into npm scripts).
- Switching databases: change `DATABASE_URL` — the Prisma schema and libsql adapter already support remote libsql/Postgres-style URLs.
