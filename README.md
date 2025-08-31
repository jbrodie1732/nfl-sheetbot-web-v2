
# nfl-sheetbot-web

Next.js (App Router, TypeScript) web app for Sheet Meat (NFL picks). Uses Supabase (Postgres + Auth).

## Quick start

```bash
# 1) Node & package manager
#    Use Node 20+ and pnpm (recommended) or npm
pnpm i

# 2) env
cp .env.example .env.local
# fill in values

# 3) dev
pnpm dev
```

## Environment
- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
- `NEXT_PUBLIC_SITE_URL` – your Vercel domain (e.g., https://sheetmeat.vercel.app)
- `NEXT_PUBLIC_APP_WEEK_NUMBER` – optional override; if set, takes precedence over DB current-week
- `NEXT_PUBLIC_ADMIN_EMAIL` – email allowed to access /admin

## Pages
- `/` – Week view with countdown, grouped kickoff windows, picks
- `/login` – magic-link login
- `/admin` – enqueue admin jobs and view recent ones

## Notes
- No service role key is ever used in this repo.
- Realtime subscription updates your local pick state when any pick changes for the active week.
