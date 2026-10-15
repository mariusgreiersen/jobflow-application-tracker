# ADR 0006: Optimistic updates through PendingChange

**Status:** Accepted

## Context

Kanban moves must feel instant and roll back if saving fails. Implementing that in the UI tempted the UI to recompute business rules for the preview, duplicating the use case.

## Decision

Use cases that modify an entity return a `PendingChange<T>`: a `preview` (the entity after the rule is applied) and `commit()` (persist it). The UI renders the preview, awaits `commit()`, and restores its previous copy on failure.

## Consequences

- Business rules exist once, in the core, and the UI only handles rendering and rollback.
- The pattern is testable without a UI: tests assert the preview and that nothing persists until `commit()`.
- Callers must remember to commit. The provider funnels every change through one helper (`commitApp` / `commitTask`).
