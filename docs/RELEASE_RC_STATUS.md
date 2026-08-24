# STO NSK Release Candidate Status

Updated: 2026-08-24

## Verified

- GitHub Actions CI #125 on the current feature head: Install, Typecheck, Vitest Tests and Cloudflare/OpenNext Build all passed.
- Booking availability tests cover reservation overlap and technical-break boundaries.
- PostgreSQL booking constraints protect against resource double booking.
- Tenant access is enforced through business membership/server-side guards and RLS.
- Cloudflare/OpenNext configuration is present and aligned with the deployment workflow.
- Manual production smoke workflow is available at `.github/workflows/production-smoke.yml`.

## Remaining release gates

1. Configure and verify production environment variables in Cloudflare.
2. Set the GitHub secret `PRODUCTION_URL` and run the manual production smoke workflow for `/`, `/api/health`, `/api/stations` and the Telegram auth contract.
3. Review the three high-severity advisories reported by `npm install` before unrestricted production traffic.
4. Enable Supabase Auth leaked-password protection in the project console.
5. Verify Telegram Bot token/webhook configuration and Mini App origin in production.

## Notes

Legacy Vercel integrations still publish status checks on the PR and may report deployment-rate-limit failures. They are not the target production runtime for STO NSK; Cloudflare Workers + OpenNext is the documented deployment path.

The repository remains on `feat/sto-nsk-foundation` until these external gates are completed. `main` is intentionally unchanged.
