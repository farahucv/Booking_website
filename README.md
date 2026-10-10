# Jood — Jood Alshawi Studio

A makeup studio website for Jood Alshawi in Buraidah, Saudi Arabia. The application combines service and portfolio presentation with appointment requests, booking tracking, and an administration dashboard. It supports Arabic and English, RTL and LTR layouts, Saudi riyal pricing, and the `Asia/Riyadh` time zone.

## Features

- Evening, engagement, and bridal makeup services, with hair and service-location options.
- Server-side price and deposit calculations, with availability based on working hours, service durations, and blocked times.
- Booking review, preliminary approval, deposit receipt upload, and confirmation, plus rejection, cancellation, and a 24-hour deposit deadline.
- Private booking tracking links and administration tools for settings, bank details, and portfolio images.
- Optional Google Calendar integration through the Lovable connector gateway, plus WhatsApp and social links.

## Technology

React 19, TypeScript, TanStack Start/Router/Query, Vite 8, Tailwind CSS 4, Supabase for authentication, database access, and storage, and Drizzle for PostgreSQL migrations. Tests use Vitest and Testing Library.

## Local Development

Use a Node.js version compatible with Vite 8. Setup was validated with Node.js 24 and Bun 1.3.14. The repository uses `bun.lock`.

```sh
git clone https://github.com/farahucv/Jood.git
cd Jood
bun install --frozen-lockfile
# Configure the environment variables below before starting.
bun run dev -- --host 0.0.0.0 --port 3000
```

Some package URLs in the lockfile point to a Lovable package mirror and may return HTTP 403 outside its environment. Do not delete the lockfile or disable integrity verification to bypass this issue. The cloud environment's saved `install_script` contains a tested procedure that warms Bun's cache from the public npm registry using a temporary lockfile copy, preserving package versions, integrity hashes, and the original repository lockfile.

## Environment Variables

For local development, you can use `.env.local`, which is ignored by Git. Review existing configuration before replacing it, and never commit secrets.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL for server requests. |
| `SUPABASE_PUBLISHABLE_KEY` | Public key for user requests and authentication. |
| `VITE_SUPABASE_URL` | Supabase project URL used by the browser. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key used by the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key for settings and booking operations; required by the home page. It bypasses RLS and must never be exposed to the browser or given a `VITE_` prefix. |
| `LOVABLE_DB_MIGRATION_URL` | PostgreSQL connection URL used only when running migrations. |
| `GOOGLE_CALENDAR_API_KEY` and `LOVABLE_API_KEY` | Credentials for Google Calendar through the Lovable connector gateway, when enabled. |
| `LOVABLE_CRON_SECRET` | Secret used by the scheduled-request authentication helper. The current expiration endpoint does not invoke this helper yet. |
| `LOVABLE_CRON_SECRET_PREVIOUS` | Optional previous secret for rotation support in the authentication helper. |

Use URLs and keys belonging to the same Supabase project. After changing `VITE_` variables, restart the development server and rebuild for deployment because these values are included in the browser bundle. In the cloud environment, provide secrets through environment settings rather than chat.

## Supabase and Booking Setup

1. Set up a Supabase project and authentication. Review the migrations in `drizzle/migrations/` in order before applying them to a development database. `drizzle.config.ts` reads `LOVABLE_DB_MIGRATION_URL`. Review changes and take a backup before applying migrations to production.
2. Ensure the `receipts` and `portfolio` storage buckets exist with appropriate access policies. The migrations include file policies; those policies do not replace bucket provisioning.
3. Set up the administrator account. The current implementation lets the first user calling `claimAdmin` become an administrator if none exists. Review this mechanism before making the site public.
4. Enter service durations and working hours in the administration dashboard, then enable booking. Booking remains closed until the required durations and working hours are complete.
5. Add bank details before granting preliminary approval to requests, and upload portfolio images.
6. If using Google Calendar, connect it in Lovable and select the booking calendar and calendars that affect availability. When busy calendars are configured but unavailable, availability calculation fails rather than ignoring conflicts.

Allow outbound access to your Supabase project hostname. Calendar integration also requires access to `connector-gateway.lovable.dev`. Starting Vite alone does not establish that these external services work.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server. |
| `bun run build` | Build the application for deployment. |
| `bun run build:dev` | Build in development mode. |
| `bun run preview` | Preview the build output. |
| `bun run test` | Run the test suite once. |
| `bun run test:watch` | Run tests in watch mode. |
| `bun run lint` | Run ESLint. |
| `bun run format` | Format files; this command modifies them. |

The build uses Nitro with the default Cloudflare target through Lovable's configuration package. Review the deployment target and environment variables before deploying to another platform.

## Project Structure

```text
src/routes/                   Pages and server routes
src/components/               UI components
src/lib/bookings.functions.ts Booking functions exposed to the frontend
src/lib/bookings.server.ts    Availability calculations and server operations
src/lib/settings.functions.ts Studio and administration settings
src/lib/calendar.server.ts    Google Calendar integration
src/lib/i18n.tsx              Translation and number/date formatting
src/integrations/supabase/    Supabase clients, authentication, and types
src/test/                    Tests
drizzle/                     Database schema and migrations
```

| Route | Page |
| --- | --- |
| `/` | Home, services, and portfolio. |
| `/book` | Booking request. |
| `/track/:token` | Booking tracking through a private token. |
| `/auth` | Authentication. |
| `/admin` | Administration dashboard; requires authentication and administrator permissions. |

Routing is file-based. Do not manually edit `src/routeTree.gen.ts`. Follow `AGENTS.md` and preserve the visual identity and booking links. The project is connected to [Lovable](https://lovable.dev/projects/4ffbe0fe-a62c-45aa-9495-2c892cec869f); avoid rewriting published Git history or force-pushing.

## Validation and Setup Status

During environment setup on October 10, 2026, dependency installation, the build, and the existing test passed. The test suite contains one routing test. `/auth` returned HTTP 200 and rendered email and password fields; actual sign-in was not tested.

The home page returned HTTP 500 because `SUPABASE_SERVICE_ROLE_KEY` was missing, and outbound access to the Supabase project was blocked with HTTP 403. The key requirement, hostname, and installation/startup instructions were saved in the environment draft. Apply those settings and repeat validation. These are observations from that setup session, not a guarantee of a later runtime's state.

After configuring the prerequisites, validate a complete booking flow using development data: create a request, grant preliminary approval, upload a receipt, confirm the booking, and track its status. Also test conflicting appointments and deposit expiration. Do not use real customer bookings for these checks.

## Improvement Priorities

1. **Security before launch:** `POST /api/public/hooks/expire-deposits` currently checks only the `Bearer` prefix. Integrate `authenticateCronRequest` and test rejection of missing and incorrect secrets. Also review first-user administrator assignment and anonymous receipt-upload policies.
2. **Booking tests:** Cover pricing, concurrent bookings, administrator permissions, receipt uploads, and expiration. The existing routing test does not cover these behaviors.
3. **Clear error handling:** Replace the generic `Error` message with a useful explanation and retry action. Check Supabase query errors instead of implicitly treating failures as empty data.
4. **Complete translation:** Move hardcoded Arabic booking-button text on the home page into the translation dictionary. Review both languages on mobile.
5. **Calendar reliability:** Support Google Calendar result pagination and track synchronization failures with retries that avoid duplicate events.
6. **Continuous validation:** Run builds, tests, and type checks in CI, and add alerts for booking and integration failures without logging customer data or secrets.
