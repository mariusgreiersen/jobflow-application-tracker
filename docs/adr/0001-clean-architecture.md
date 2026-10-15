# ADR 0001: Clean Architecture with enforced boundaries

**Status:** Accepted

## Context

JobFlow has real business rules (status transitions, an applied-date invariant, conversion metrics that depend on history) and two storage backends (Supabase and an in-browser demo). Early on, some rules lived inside React components and the persistence interface sat beside its implementations. Rules were hard to test in isolation and easy to duplicate.

## Decision

Structure the code in layers: `core/domain`, `core/application` (use cases, queries, ports), `infrastructure` (adapters, composition roots) and presentation. Dependencies point inward. Enforce this with `no-restricted-imports` rules in ESLint, so violations fail CI.

## Consequences

- Business rules are tested without React, Next.js or a database, in milliseconds.
- Adding demo mode required no change to business code.
- More files and one level of indirection for simple operations. Mitigated by keeping use cases as small factory functions rather than classes.
