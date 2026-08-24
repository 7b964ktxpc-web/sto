# STO NSK — production MVP architecture

## Product decision

STO NSK is a multi-tenant marketplace where the transaction is an appointment and the differentiator is live queue visibility. The same domain services are consumed by Web, Telegram Mini App, Business and Admin surfaces.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + PostGIS + Supabase Auth/Realtime/Storage
- Zod for request/domain validation
- Server-side service/repository layer; clients never own authorization decisions
- Provider adapters for maps, notifications, payments and Telegram
- Vercel for web/cron/edge delivery

## Repository structure

```text
src/
  app/
    (marketplace)/
    (account)/
    business/
    admin/
    api/
  components/
    ui/
    marketplace/
    booking/
    business/
    admin/
  domain/
    booking/
    queue/
    availability/
    permissions/
  server/
    auth/
    repositories/
    services/
    notifications/
    maps/
    payments/
  lib/
    supabase/
    validation/
    formatting/
  types/
  tests/
supabase/
  migrations/
  seed.sql
docs/
```

## Tenant boundary

Every business-owned record carries `business_id`. Business authorization is checked server-side through membership + permission, never from a client-provided role. RLS mirrors this boundary for direct Supabase access.

## Roles

`CLIENT`, `BUSINESS_OWNER`, `BUSINESS_MANAGER`, `MODERATOR`, `SUPPORT`, `FINANCE`, `ADMIN`, `SUPER_ADMIN`.

Permissions are atomic (`business.read`, `business.manage`, `booking.manage`, `queue.manage`, `review.moderate`, `finance.manage`, etc.) and role-to-permission mappings are data-driven.

## Booking engine

1. Validate user, business, service and car.
2. Resolve business-service duration and required resources.
3. Build candidate intervals from working hours minus exceptions/breaks.
4. Resolve eligible employees/workstations.
5. Remove intervals occupied by appointment resources.
6. On booking, start a transaction and acquire a deterministic advisory lock for business + date.
7. Re-check availability inside the transaction.
8. Insert appointment + resource reservations atomically.
9. Emit appointment event and notification job.

`appointment_resources` uses PostgreSQL range exclusion constraints to make overlapping reservations for the same employee/workstation impossible even under concurrent requests.

## Queue engine

Queue is a business-level operational stream. Entries transition through:

`WAITING -> CALLED -> IN_SERVICE -> READY -> COMPLETED`

with `CANCELLED` and `NO_SHOW` terminal alternatives. Position and ETA are derived from active entries and service estimates; the UI subscribes to realtime changes.

## API surface

### Marketplace
- `GET /api/search`
- `GET /api/businesses/:slug`
- `GET /api/businesses/:id/availability`
- `GET /api/catalog/services`

### Client
- `GET/POST /api/cars`
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/:id/cancel`
- `POST /api/appointments/:id/reschedule`
- `GET /api/favorites`
- `POST /api/reviews`

### Business
- `GET/POST /api/business/appointments`
- `PATCH /api/business/appointments/:id`
- `GET/POST /api/business/services`
- `GET/POST /api/business/employees`
- `GET/POST /api/business/workstations`
- `GET/POST /api/business/queue`
- `PATCH /api/business/queue/:entryId`

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/businesses`
- `PATCH /api/admin/businesses/:id`
- `GET /api/admin/users`
- `GET /api/admin/appointments`
- `GET /api/admin/queues`
- `PATCH /api/admin/reviews/:id`
- `GET /api/admin/audit-logs`

## User flows

### Client
Search -> filters -> business -> service -> car -> date -> slot -> confirmation -> Telegram reminder -> queue/status -> review.

### Business
Registration -> moderation -> business setup -> services/resources/hours -> calendar -> appointments -> queue -> analytics.

### Admin
Dashboard -> moderation queues -> business/user/appointment/review operations -> audit log.

## Design system

Light-first automotive SaaS UI. Neutral surfaces, high-contrast text, restrained blue/teal accent, compact status badges, 12–16px radius, 8px spacing grid. Marketplace uses large search surfaces and cards; Business/Admin use dense tables and calendars. Mobile-first marketplace; desktop-first operations dashboards.

## MVP cut

Phase 1: foundation + auth + schema + seed.

Phase 2: marketplace search/profile/map.

Phase 3: cars + availability + booking + notifications.

Phase 4: business dashboard.

Phase 5: live queue + realtime.

Phase 6: Telegram Mini App/bot.

Phase 7: admin.

Phase 8: analytics/monetization.

Deferred: parts marketplace, warehouse/accounting, loyalty, AI diagnostics, deep CRM integrations.

## Critical tests

- Concurrent booking for one slot: exactly one succeeds.
- Booking outside hours/exceptions: rejected.
- Booking overlapping employee/workstation reservation: rejected.
- Cross-tenant read/write: denied.
- Manager cannot execute admin-only mutations.
- Queue transitions and realtime events are monotonic and auditable.
