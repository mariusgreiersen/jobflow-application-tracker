# Architecture

This document explains how JobFlow is structured, which design principles it applies, and where it deliberately doesn't apply them. The *why* behind each major choice is in the [Architecture Decision Records](adr/).

## Layers

```
            ┌───────────────────────────────────────────────┐
            │ Presentation   app/ features/ components/ lib/ │
            │  pages · views · Server Actions · presenters   │
            └──────────────┬────────────────────┬────────────┘
                           │ uses               │ obtains use cases from
                           ▼                    ▼
┌──────────────────────────────────┐   ┌─────────────────────────────┐
│ Core                    core/     │◄──│ Infrastructure  infrastructure/
│  application/  use cases, queries,│   │  Supabase adapters           │
│                ports, errors      │   │  demo (localStorage) adapter │
│  domain/       entities + rules   │   │  composition roots           │
└──────────────────────────────────┘   └─────────────────────────────┘
        ▲ implements ports ───────────────────────┘
```

| Layer | Knows about | Must not know about |
|---|---|---|
| `core/domain` | Nothing but itself (and `date-fns`) | Use cases, React, Next.js, Supabase, Zod |
| `core/application` | Domain | Frameworks, adapters, UI |
| `infrastructure` | Core (it implements the ports) | Presentation |
| Presentation | Core, plus infrastructure **only** through `infrastructure/composition/*` | Concrete adapters, Supabase SDK |

### The dependency rule is enforced

[`eslint.config.mjs`](../eslint.config.mjs) configures `no-restricted-imports` per layer. Importing React into the domain, or importing `SupabaseApplicationRepository` from a component, is a lint error and fails CI. The rules were verified by temporarily adding deliberate violations and confirming each was rejected.

## SOLID in this codebase

### Single Responsibility: one reason to change

| Unit | Its one job |
|---|---|
| [`core/domain/status.ts`](../src/core/domain/status.ts) | Status rules: what counts as submitted/closed, how a status change or interview is planned |
| [`core/domain/metrics.ts`](../src/core/domain/metrics.ts) | Metric definitions (totals, conversion rates, weekly buckets) |
| [`core/application/queries/*`](../src/core/application/queries) | Shape data for one screen each (dashboard, analytics, agenda, board) |
| `Supabase*Repository` | One class per table: persistence for that table only |
| [`infrastructure/supabase/errors.ts`](../src/infrastructure/supabase/errors.ts) | Translate database errors into core errors |
| [`lib/presenters/*`](../src/lib/presenters) | How things look and read (labels, colours, messages) |
| [`features/jobs/job-data-provider.tsx`](../src/features/jobs/job-data-provider.tsx) | UI state and optimistic rendering. It makes no business decisions. |

The clearest example: "which applications fall in this date range" used to live in the analytics page component. A change to the definition and a change to the page layout were then the same edit. Now the rule is in `queries/analytics.ts` with its own tests, and the page only renders.

### Open/Closed: extend without modifying

- **New storage backend:** implement the four repository ports and add a branch in the composition root. No use case, query or component changes. Demo mode was added exactly this way.
- **New screen:** add a query in `core/application/queries`. Existing queries and domain rules stay untouched.
- **New auth provider:** implement `AuthGateway`. Server Actions and use cases don't change.

### Liskov Substitution: adapters are interchangeable

`DemoRepository` and the Supabase repositories implement the same ports *and the same behavioural contracts*, not just the same method signatures:

- deleting an application also removes its follow-ups and history (DB: `ON DELETE CASCADE`; demo: explicit)
- a follow-up for a missing or foreign application is rejected with `NotFoundError` (DB: composite foreign key → translated `23503`; demo: explicit check)
- every application change produces the same history events (DB: trigger; demo: the same `deriveActivity` rule)

These contracts are tested: [`tests/database/rls.test.ts`](../tests/database/rls.test.ts) for the database and [`tests/demo-repository.test.ts`](../tests/demo-repository.test.ts) for the demo adapter.

### Interface Segregation: small, role-specific ports

Instead of one `JobRepository` with eleven methods, the core defines `ApplicationRepository`, `FollowUpRepository`, `ActivityLog` (read-only) and `ProfileRepository`, plus `AuthGateway` and `Clock`. Each use case depends only on what it uses: `makeFollowUpUseCases` can't touch applications, and nothing in the core can write history directly.

### Dependency Inversion: the core owns the abstractions

The ports live in `core/application/ports`, next to the code that needs them. Infrastructure depends on them, never the reverse. Use cases receive their dependencies as arguments:

```ts
// core/application/use-cases/application-use-cases.ts
export function makeApplicationUseCases({ applications, followUps, clock }: ApplicationUseCasesDeps) { … }

// infrastructure/composition/client.ts (the composition root)
makeApplicationUseCases({ applications: new SupabaseApplicationRepository(db, userId), followUps, clock: systemClock });
```

Even time is injected (`Clock`), which is why use-case tests are deterministic.

## Dependency injection: pure DI, no container

Dependencies are passed explicitly through factory functions and wired in two **composition roots**:

- [`infrastructure/composition/client.ts`](../src/infrastructure/composition/client.ts): browser; picks Supabase or demo adapters
- [`infrastructure/composition/server.ts`](../src/infrastructure/composition/server.ts): server; auth gateway and site URL

A DI container (InversifyJS, tsyringe) was considered and rejected ([ADR 0002](adr/0002-pure-dependency-injection.md)). With about ten dependencies, explicit wiring is shorter, fully type-checked, and readable without knowing a framework.

## Design patterns used

| Pattern | Where | Why |
|---|---|---|
| Ports & Adapters (Hexagonal) | `core/application/ports` ↔ `infrastructure/*` | Swap persistence and auth without touching business code |
| Repository | `Supabase*Repository`, `DemoRepository` | Collection-like access to entities, hiding SQL/storage |
| Adapter / Translator | `infrastructure/supabase/mappers.ts`, `errors.ts` | Convert rows ↔ entities and vendor errors ↔ core errors |
| Composition Root | `infrastructure/composition/*` | The only place concrete classes are chosen |
| Factory | `make*UseCases` | Build use cases from injected ports |
| Command | `PendingChange` (`preview` + `commit()`) | Decide a change once, render it optimistically, execute it later |
| Read model (CQRS-lite) | `core/application/queries/*` | Screens get tailored, tested views; writes go through use cases |
| Presenter | `lib/presenters/*` | Turn core values into labels, colours and messages |
| Gateway | `AuthGateway` / `SupabaseAuthGateway` | Wrap an external identity service behind a narrow interface |

## Where principles are deliberately *not* applied

Over-applying patterns is its own design smell. These are conscious choices:

- **Domain entities are plain types, not classes.** The rules are pure functions over immutable data. That fits React's state model and serialises cleanly to `localStorage` and across the server/client boundary.
- **Presentation may read domain functions directly** for trivial, side-effect-free formatting (e.g. `isClosed` to filter a dropdown). Wrapping one-line pure functions in use cases would add indirection without protecting anything.
- **`DemoRepository` is one class implementing four ports.** It emulates a whole database, including cross-table cascades, so splitting it would spread one responsibility across files.
- **Validation happens twice on purpose.** Zod validates raw form strings in presentation, for field-level UI errors. Use cases re-check business invariants (`ValidationError`), so the core stays correct no matter the caller.

## How a change flows

Dragging *Hooli* from Applied to Interview:

1. `KanbanBoard` (presentation) calls `moveApplication(id, "interview")` on the provider.
2. The provider asks the use case: `applications.move(app, "interview")`.
3. The use case calls the domain rule `planStatusChange`, which stamps the applied date if missing, and returns a `PendingChange`.
4. The provider renders `change.preview` immediately, then awaits `change.commit()`.
5. `commit()` calls `ApplicationRepository.updateApplication`, implemented by Supabase (RLS checks ownership; a trigger records history) or by the demo store.
6. On failure, the adapter's error is translated to a core error, the provider restores the previous version, and the presenter turns the error into a message.

## Testing strategy

| Level | Tool | What it proves |
|---|---|---|
| Domain and queries | Vitest | Business rules and metric definitions, including time zones and empty data |
| Use cases | Vitest + in-memory port fakes ([`tests/fakes.ts`](../tests/fakes.ts)) | Orchestration, validation, preview vs. commit, rollback on failure, no account enumeration |
| Adapters | Vitest | Demo adapter honours the port contracts; Supabase errors translate correctly |
| Database | Vitest + PGlite running the real migration | RLS isolation, composite-FK ownership, triggers, constraints, cascades |
| Components | Vitest + Testing Library | Form validation and accessible error states |
| End to end | Playwright (desktop + mobile) | Real user flows in a production build, no console errors, no horizontal overflow |

A coverage gate on `src/core` (statements, functions, lines ≥ 95%; branches ≥ 88%) runs in CI.
