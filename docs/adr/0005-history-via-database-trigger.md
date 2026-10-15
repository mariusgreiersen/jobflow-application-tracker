# ADR 0005: Application history written by a database trigger

**Status:** Accepted

## Context

Analytics need history: an application rejected after an interview still counts as having reached the interview stage. History written by client code could be forged or skipped.

## Decision

A `security definer` trigger on `applications` writes `application_activity` rows. Users have no INSERT policy on that table. The core exposes history through a read-only `ActivityLog` port. The demo adapter mirrors the trigger using the shared `deriveActivity` domain rule.

## Consequences

- History can't be forged from the client, and every write path records it.
- The UI re-reads history after changes, which costs one small query.
- The trigger (SQL) and `deriveActivity` (TypeScript) must agree, and both are tested.
