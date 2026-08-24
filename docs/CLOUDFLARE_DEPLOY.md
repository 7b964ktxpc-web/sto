# STO NSK — Cloudflare deployment

## Runtime

STO NSK uses Next.js App Router deployed to Cloudflare Workers through `@opennextjs/cloudflare`.

- `wrangler.jsonc` — Worker runtime and environments
- `open-next.config.ts` — OpenNext adapter
- `preview` — production-like `workerd` preview
- `deploy` — OpenNext build + Worker deploy

## Required secrets

Configure these in Cloudflare Workers for `staging` and `production`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN` (required for Telegram notifications)

Do not commit any secret values to git.

## Supabase connectivity

The application can use `@supabase/supabase-js` directly from Workers. Cloudflare also supports Hyperdrive for direct PostgreSQL access to Supabase. Hyperdrive should be introduced only after a production Hyperdrive configuration is created and its binding ID is available; until then the existing Supabase client path remains the source of truth.

## Deployment sequence

1. Authenticate Wrangler (`wrangler login`) in a Cloudflare-enabled environment.
2. Run `wrangler check`.
3. Run `npm run preview` and verify the app under `workerd`.
4. Configure production secrets.
5. Deploy with `npm run deploy -- --env production`.
6. Verify `/`, `/marketplace`, `/account`, `/business`, `/admin`, `/queue` and `/api/health`.

## Hyperdrive follow-up

Create a Hyperdrive configuration pointing at the STO NSK Supabase Postgres endpoint. Use a dedicated database role with least privilege rather than the master `postgres` role. Then add the resulting Hyperdrive binding to `wrangler.jsonc` and migrate server-side database access to `pg` where latency-sensitive direct SQL is needed.
