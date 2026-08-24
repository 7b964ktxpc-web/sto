# STO NSK — Cloudflare deployment

## Runtime

STO NSK uses Next.js App Router deployed to Cloudflare Workers through `@opennextjs/cloudflare`.

- `wrangler.jsonc` — Worker runtime and environments
- `open-next.config.ts` — OpenNext adapter
- `preview` — production-like `workerd` preview
- `deploy` — OpenNext build + Worker deploy
- `.github/workflows/cloudflare.yml` — production deployment from GitHub Actions

Cloudflare's current Next.js guidance supports App Router, Route Handlers, SSR, RSC, Server Actions and other core Next.js features through the OpenNext adapter. The `preview` command is recommended because it runs against the Workers runtime rather than Node.js. See the official guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Required secrets

Configure these as GitHub Actions repository secrets and/or Cloudflare Worker secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN` (required for Telegram notifications)
- `TELEGRAM_WEBHOOK_SECRET` (required for webhook verification)

Do not commit any secret values to git.

## Supabase connectivity

The application uses `@supabase/supabase-js` directly from Workers for the current MVP. Cloudflare also supports Hyperdrive for direct PostgreSQL access to Supabase. Hyperdrive should be introduced only after a production Hyperdrive configuration is created and its binding ID is available; until then the existing Supabase client path remains the source of truth.

Cloudflare recommends using Hyperdrive with Supabase's **Direct connection** string rather than a pooled connection string; Hyperdrive performs the connection pooling itself. See: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/

## Deployment sequence

1. Authenticate Wrangler in a Cloudflare-enabled environment.
2. Run `wrangler check`.
3. Run `npm run preview` and verify the app under `workerd`.
4. Configure production secrets.
5. Deploy with `npm run deploy -- --env production`.
6. Verify `/`, `/marketplace`, `/account`, `/business`, `/admin`, `/queue` and `/api/health`.

For GitHub Actions, the `Cloudflare Workers` workflow runs typecheck → Next build → OpenNext deploy. It is intentionally manual/main-branch gated and requires the secrets listed above.

## Hyperdrive follow-up

Create a Hyperdrive configuration pointing at the STO NSK Supabase Postgres endpoint. Use a dedicated database role with least privilege rather than the master `postgres` role. Then add the resulting Hyperdrive binding to `wrangler.jsonc` and migrate latency-sensitive server-side direct SQL access to `pg` where appropriate.

Cloudflare documents Hyperdrive as the recommended path for connecting Workers to existing Postgres databases, including Supabase. See: https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/
