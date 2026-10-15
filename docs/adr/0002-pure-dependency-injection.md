# ADR 0002: Pure dependency injection instead of a DI container

**Status:** Accepted

## Context

Use cases need repositories, an auth gateway and a clock. Options: a container library (InversifyJS, tsyringe) with decorators, or passing dependencies explicitly.

## Decision

Use *pure DI*: `make*UseCases(deps)` factories, wired in two composition roots (`infrastructure/composition/client.ts` and `server.ts`).

## Consequences

- Wiring is type-checked and readable without knowing a framework.
- No decorators or `reflect-metadata` and no runtime registry, and it works the same on server and client.
- If the dependency graph grew large, a container might become worthwhile. At about ten dependencies it would be ceremony.
