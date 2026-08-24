# STO NSK release checklist

## CI
- [ ] npm install
- [ ] npm run typecheck
- [ ] npm test
- [ ] npm run build:worker

## Supabase
- [ ] Apply all migrations to `sto-nsk`
- [ ] Confirm RLS is enabled on tenant/user tables
- [ ] Confirm booking and business RPCs are not publicly executable
- [ ] Configure Auth leaked-password protection
- [ ] Configure production redirect URLs

## Cloudflare
- [ ] Production branch = `main` after PR merge
- [ ] Build command = `bun run build:worker` / project-config equivalent
- [ ] Deploy command = `bun run deploy`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `TELEGRAM_BOT_TOKEN`
- [ ] Set `NEXT_PUBLIC_APP_URL`

## Smoke tests
- [ ] `/api/health`
- [ ] `/api/stations`
- [ ] `/auth`
- [ ] `/account`
- [ ] `/business`
- [ ] `/admin`
- [ ] `/tg`
