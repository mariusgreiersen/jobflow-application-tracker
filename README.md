# JobFlow: Job Application Tracker

**Your job search. Finally organized.** JobFlow is a full-stack web app for tracking job applications, interviews, follow-ups and offers in one workspace. It has a drag-and-drop pipeline, an interview agenda, and analytics computed from your real application history.

![JobFlow landing page](docs/screenshots/landing.png)

> **Live demo:** _not deployed yet._ Run it locally in demo mode in under a minute (see [Quick start](#quick-start)); no account or database is needed.

[![CI](https://github.com/SqushiLoL/jobflow-application-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/SqushiLoL/jobflow-application-tracker/actions/workflows/ci.yml)

---

## At a glance

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui · Supabase (Auth, Postgres, RLS) · Recharts · dnd-kit · React Hook Form + Zod |
| **Security** | Row Level Security on every table, verified by automated tests against the real migration |
| **Testing** | 71 Vitest tests: domain logic, validation, a React form, the demo data store and the database policies |
| **CI** | GitHub Actions runs lint, type-check, tests and a production build on every push and PR |
| **Demo mode** | ~20 realistic fictional applications stored only in the visitor's browser, so it works without Supabase |

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **Authentication** with Supabase: sign up, log in, log out, password reset by email, persistent cookie sessions, protected routes checked on the server, and a profile with name and avatar initials.
- **Application management**: create, view, edit, delete, withdraw and archive applications. Each one stores company, title, logo (or generated initials), location, work type, posting URL, status, applied date, interview time and notes, salary range and currency, and personal notes. Forms validate with Zod and show inline, accessible errors.
- **Kanban board**: drag cards between Saved → Applied → Interview → Offer → Rejected. Updates are optimistic and **rolled back automatically if the save fails**. Every card also has a status menu as a keyboard and screen-reader friendly alternative to dragging, and the board scrolls horizontally on small screens.
- **Search, filters and sorting**: accent-insensitive search across company, title and location, combined with status, work type, applied-date range and an archived toggle. Sort by newest, oldest, company or upcoming interview, and clear everything in one click.
- **Agenda**: upcoming interviews grouped by day in the viewer's local time zone, plus follow-up reminders split into overdue, today, upcoming and completed groups.
- **Dashboard**: four live metrics, applications over time, status distribution, upcoming interviews, follow-ups due, recent activity and a quick-add button.
- **Analytics**: cumulative applications, applications per week, status distribution, weekly activity trend, and interview/offer conversion rates. Each formula is shown next to its number, and every chart can be switched to a data table.
- **Polish**: light, dark and system themes; loading skeletons; empty states; toasts; responsive down to phone width; keyboard focus states; respects reduced motion.

| Board | Agenda |
|---|---|
| ![Kanban board](docs/screenshots/board.png) | ![Agenda](docs/screenshots/agenda.png) |
| **Analytics (dark mode)** | **Application detail** |
| ![Analytics](docs/screenshots/analytics-dark.png) | ![Application detail](docs/screenshots/application-detail.png) |

<p align="center"><img src="docs/screenshots/mobile-dashboard.png" alt="Mobile dashboard" width="300"></p>

## Quick start

Requires Node.js 20.9+ (CI uses Node 24).

```bash
git clone https://github.com/SqushiLoL/jobflow-application-tracker.git
cd jobflow-application-tracker
npm install
npm run dev
```

Open <http://localhost:3000> and click **Try the demo**. Without Supabase credentials, the demo works fully and account pages explain that sign-up is disabled.

### Connecting Supabase (real accounts)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema: open **SQL Editor**, paste [`supabase/migrations/20261015000000_initial_schema.sql`](supabase/migrations/20261015000000_initial_schema.sql) and run it. With the Supabase CLI, `supabase link` followed by `supabase db push` does the same.
3. Under **Authentication → URL Configuration**, set **Site URL** to your app URL and add `http://localhost:3000/auth/callback` (plus your production `/auth/callback` URL) to **Redirect URLs**.
4. Copy `.env.example` to `.env.local` and fill it in from **Project Settings → API**:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | for accounts | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | for accounts | Publishable (anon) key. Safe in the browser because RLS controls access. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted. |
| `NEXT_PUBLIC_SITE_URL` | in production | Public URL used in auth email links. Locally it falls back to the request origin. |

The app never uses the **service-role key**. Don't add it to any environment.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | Run all Vitest tests once |
| `npm run check` | Lint + typecheck + tests |

## Architecture

```
src/
  app/
    (marketing)/          Landing page
    (auth)/               Login, sign-up, forgot/reset password
    (dashboard)/          Dashboard, applications, board, agenda, analytics, settings
    auth/callback/        Handles links from Supabase auth emails
    demo/                 Route that starts demo mode
  proxy.ts                Next 16 "proxy" (formerly middleware): session refresh + route guard
  lib/
    domain/               Pure business logic: statuses, metrics, filters, dates, activity
    data/                 Repository interface + Supabase and demo (localStorage) implementations
    validations/          Zod schemas shared by forms and server actions
    supabase/             Browser/server clients and env detection
    demo/                 Seed generator for demo data
  features/               Feature UIs (dashboard, applications, kanban, agenda, analytics, auth…)
  components/             Shared UI: shadcn/ui primitives, charts, layout
supabase/migrations/      SQL schema, triggers and RLS policies
tests/                    Vitest unit, component and database tests
```

**Data flow.** Pages share one `JobDataProvider` that talks to a `JobRepository` interface:

- **Signed-in users** get `SupabaseRepository`. Queries run in the browser with the user's session, so Postgres RLS decides what is visible. No API layer can forget an ownership check.
- **Demo visitors** get `DemoRepository`, which reads and writes `localStorage` only. It can't reach Supabase, so demo users are isolated from real accounts and from each other.

Components never branch on the mode. The same screens, validation and business rules run on both repositories.

**Auth on the server.** `proxy.ts` refreshes the Supabase session cookie on each request and redirects unauthenticated visitors away from app routes. The dashboard layout then verifies the user again with `supabase.auth.getUser()` before rendering, so the proxy isn't the only gate. Sign-in, sign-up and password changes are Server Actions that re-validate their input with the same Zod schemas the forms use.

## Database design

```
auth.users ─┬─< profiles              (1:1, created by trigger on sign-up)
            ├─< applications ─┬─< follow_up_tasks       FK (application_id, user_id)
            │                 └─< application_activity  FK (application_id, user_id)
```

- **`applications`**: one row per job. `status` is limited by a CHECK to `saved | applied | interview | offer | rejected | withdrawn`. `date_applied` is a `date` (a calendar day, so it never shifts across time zones). `interview_at` and `archived_at` are `timestamptz`. CHECKs also cover text lengths, `http(s)` URLs, salary ≥ 0 with max ≥ min, and ISO currency codes.
- **`follow_up_tasks`**: reminders with `due_at` and a nullable `completed_at`.
- **`application_activity`**: an append-only history of creation, status changes, scheduled interviews and archiving. Analytics read it, for example to count an application that reached an interview before being rejected.
- **`profiles`**: display name, created by a `security definer` trigger when a user signs up.

Key decisions:

1. **Ownership is enforced twice.** RLS policies on every table limit `select/insert/update/delete` to rows where `user_id = auth.uid()`. Child tables also use a **composite foreign key `(application_id, user_id)`**, so the database itself rejects a follow-up attached to someone else's application.
2. **History can't be forged.** A trigger writes activity rows. It runs as `security definer`, and users have no INSERT policy on the table, so a client can read its history but can't write fake events.
3. **Archive vs. delete.** Archiving sets `archived_at` and keeps everything. Deleting cascades to follow-ups and history, and the UI says so in the confirmation dialog.
4. **Indexes** match the access patterns: `(user_id, status)`, `(user_id, date_applied)`, partial indexes on upcoming interviews and open follow-ups, and `(user_id, occurred_at)` for the activity feed.
5. **RLS performance.** Policies use `(select auth.uid())` so Postgres evaluates it once per query, not once per row.

`tests/database/rls.test.ts` runs the **real migration** in an in-process Postgres ([PGlite](https://pglite.dev)) with a stand-in for Supabase's `auth` schema. It then acts as two users to prove the isolation guarantees above, the constraints, the triggers and the cascades.

## Metric definitions

| Metric | Definition |
|---|---|
| Total applications | Every application with a status other than *Saved*. Rejected, withdrawn and archived applications still count because they were sent. |
| In progress | *Applied* or *Interview*, not archived |
| Upcoming interviews | Interview time in the future, on an application that isn't rejected, withdrawn or archived |
| Offers received | Status *Offer*, not archived |
| Interview conversion | applications that ever reached an interview ÷ submitted applications |
| Offer conversion | applications that ever reached an offer ÷ submitted applications |
| Interview → offer | reached offer ÷ reached interview |

"Ever reached" uses the activity history, so an application rejected after an interview still counts as reaching the interview stage. When the denominator is zero, rates show "—" instead of dividing by zero. Weeks start on Monday and use the viewer's time zone.

## Testing

```bash
npm test
```

| Suite | Covers |
|---|---|
| `validation.test.ts` | Application, follow-up and auth schemas; string → domain conversion including time-zone handling |
| `status.test.ts` | Status classification, transition rules (auto-dated applications, non-linear moves), activity derivation |
| `metrics.test.ts` | Dashboard metrics, conversion rates with empty data, weekly bucketing, cumulative totals, follow-up grouping |
| `filters.test.ts` | Search, combined filters, date ranges, every sort option |
| `demo-repository.test.ts` | Full application lifecycle (create → move → follow-up → archive → delete cascade), persistence across reloads, corrupt-storage recovery |
| `job-reducer.test.ts` | Optimistic update + rollback, cascading removal |
| `application-form.test.tsx` | Form validation, accessible error states and submission (React Testing Library) |
| `database/rls.test.ts` | RLS isolation between users, composite-FK ownership, activity forging, triggers, constraints, cascades |

The test run pins `TZ=Europe/Copenhagen`, so date assertions behave the same on every machine and in CI.

## Deployment (Vercel + Supabase)

1. Set up Supabase as described in [Connecting Supabase](#connecting-supabase-real-accounts).
2. Import the GitHub repository in [Vercel](https://vercel.com/new). The framework preset (Next.js) and the default build command need no changes.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` (for example `https://your-app.vercel.app`) for the Production environment, then deploy.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel domain and add `https://your-app.vercel.app/auth/callback` to Redirect URLs.
5. Check it: sign up, confirm the email, add an application, refresh, then log in from a private window as a different user and confirm the data isn't visible.

`NEXT_PUBLIC_*` variables are inlined at build time, so redeploy after changing them.

## Technical challenges and decisions

- **One UI, two backends.** Demo mode had to be fully interactive without touching real data. Putting a repository interface between the UI and persistence keeps components unaware of the mode and makes the isolation easy to show.
- **Optimistic UI that never lies.** Kanban moves, archiving and follow-up toggles update instantly. The previous version of the row is kept and restored if the save fails, with an error toast.
- **Time zones.** Applied dates are calendar days stored as `date`. Interviews and reminders are instants stored as `timestamptz` and shown in local time. Date-dependent UI renders only after client-side load, so server and browser can't disagree during hydration.
- **Analytics that survive status changes.** Conversion rates based only on current status would undercount, because a rejected application may have reached an interview first. The activity log keeps that history.
- **Accessible drag and drop.** dnd-kit's keyboard sensor is configured so arrow keys jump a whole column, with screen-reader announcements using company names. A status menu on each card offers the same action without dragging.
- **Accessible charts.** Chart colours were validated for colour-vision-deficiency separation and contrast in both themes. Each chart has a data-table view, so no value is available only through colour or hover.

## Known limitations

- **No email or push notifications.** Reminders appear only inside the app (dashboard, agenda, sidebar badge).
- **One interview per application.** An application stores its next interview; rescheduling replaces it. A multi-round `interviews` table is a natural next step.
- **Demo data stays in the browser.** Clearing site data resets the demo, and demo changes can't be moved into a real account.
- **Kanban order within a column is computed** (soonest interview or most recent application), not manually reorderable.
- **Not yet deployed.** The repo is ready for Vercel, but no production URL exists yet.

## Future improvements

- Multiple interview rounds with outcomes and interviewer notes
- Email reminders through a scheduled Supabase Edge Function
- Import from CSV or LinkedIn and browser-extension capture of job postings
- Playwright end-to-end tests in CI against a Supabase preview branch
- Attachments (CV and cover-letter versions per application) via Supabase Storage

## License

[MIT](LICENSE)
