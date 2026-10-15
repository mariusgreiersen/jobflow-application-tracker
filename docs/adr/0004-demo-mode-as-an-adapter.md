# ADR 0004: Demo mode as a second adapter

**Status:** Accepted

## Context

Recruiters must be able to try the app without an account, and demo visitors must never reach real data. The app must also run when Supabase isn't configured.

## Decision

Implement the repository ports a second time over `localStorage` (`DemoRepository`), selected in the composition root when a demo cookie is set. The demo store reproduces the database's side effects (cascades, history events, foreign-key checks).

## Consequences

- Demo visitors are fully isolated: the demo adapter has no network access to Supabase.
- Every screen and use case is shared, so the demo is the real product.
- The two adapters must stay behaviourally equivalent. Contract tests cover both.
