# STO NSK Release Candidate Status

Updated: 2026-08-24

## Verified

- GitHub Actions CI #115: Install, Typecheck, Vitest Tests and Cloudflare/OpenNext Build all passed.
- Booking availability tests cover reservation overlap and technical-break boundaries.
- PostgreSQL booking constraints protect against resource double booking.
- Tenant access is enforced through business membership/server-side guards and RLS.
- Cloudflare/OpenNext configuration is present in the repository.

## Remaining release gates

1. Configure and verify production environment variables in Cloudflare.
2. Run production smoke tests for `/`, `/api/health`, `/api/stations`, auth and booking.
3. Review the three high-severity advisories reported by `npm install` before unrestricted production traffic.
4. Enable Supabase Auth leaked-password protection in the project console.
5. Verify Telegram Bot token/webhook configuration and Mini App origin in production.

The repository remains on `feat/sto-nsk-foundation` until these external gates are completed. `main` is intentionally unchanged.
