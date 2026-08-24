# Cloudflare deployment

Production deploy uses OpenNext for Cloudflare Workers.

## Build settings

- Production branch: `main` after PR #1 is merged.
- Root directory: `/`
- Build command: `npm run build:worker`
- Deploy command: `npm run deploy`
- Node.js: 22.x

Do not use `npx wrangler deploy` as the application build command. The repository contains `wrangler.jsonc` and `open-next.config.ts`; OpenNext generates `.open-next/worker.js` and `.open-next/assets` before Wrangler deploys them.

## Required variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `TELEGRAM_BOT_TOKEN`

Keep `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` server-side only.
