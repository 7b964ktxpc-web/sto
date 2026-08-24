# STO NSK

Marketplace автосервисов Новосибирска: поиск, сравнение, онлайн-запись и живая очередь.

## MVP surfaces

- Client Web Marketplace
- Telegram Mini App + bot notifications
- Business SaaS dashboard
- Super Admin panel

## Stack

- Next.js App Router + TypeScript + React
- Tailwind CSS + shadcn/ui
- Supabase Auth / PostgreSQL / PostGIS / Realtime / Storage
- Zod validation
- Vercel

## Local

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Environment

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
CRON_SECRET
TWOGIS_CATALOG_KEY
```

Never expose the service-role key to the browser.

## Database

Migrations live in `supabase/migrations`. The first migration creates the multi-tenant marketplace schema, resource reservations, RBAC primitives and RLS baseline. The second adds the atomic booking RPC with advisory locking + PostgreSQL exclusion constraints.

See `docs/ARCHITECTURE.md` for domain boundaries, API contracts, flows and MVP scope.

## Deployment

Production deployment target: Vercel. Cloudflare/OpenNext deployment tooling is intentionally not used.

## Compliance

Before production launch, assess Russian 152-FZ personal-data requirements, consent/retention policies, Telegram data handling, and the hosting/data-residency setup.
