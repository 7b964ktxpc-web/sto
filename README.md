# НА ПОСТ

Telegram Mini App для поиска и бронирования автосервисов в Новосибирске.

## Stack
- Next.js App Router + TypeScript
- Supabase / PostgreSQL / PostGIS / RLS
- Telegram Mini App
- 2GIS MapGL / Catalog API
- Vercel

## Local
```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Production environment
Secrets are configured only in the hosting environment and never committed to Git:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `TWOGIS_CATALOG_KEY`.

The production database and personal-data hosting must be separately assessed for Russian 152-FZ requirements.
