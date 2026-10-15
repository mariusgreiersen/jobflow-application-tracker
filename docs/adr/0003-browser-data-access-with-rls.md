# ADR 0003: Browser data access secured by Row Level Security

**Status:** Accepted

## Context

Signed-in users' data could be served through Next.js Server Actions or an API layer, or queried directly from the browser with Supabase's client and the user's session.

## Decision

Query from the browser and make Postgres Row Level Security the authorisation boundary. Every table has RLS policies scoped to `auth.uid()`, and child tables use composite foreign keys `(application_id, user_id)`. The dashboard layout still verifies the session server-side before rendering.

## Consequences

- Authorisation lives in one place, the database, and no API endpoint can forget an ownership check.
- Optimistic UI is simple because writes go straight to the repository.
- Correctness depends on the policies, so they are tested by running the real migration in PGlite (`tests/database/rls.test.ts`).
