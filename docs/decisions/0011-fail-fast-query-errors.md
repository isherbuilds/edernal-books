# ADR-0011: Fail Fast On Query And Database Errors

## Status

Accepted

## Date

2026-06-28

## Context

Phase 2 and 2.5 added owner records, documents, posting, voiding, and
register queries. Several paths converted errors twice: query helpers mapped
Postgres/cursor/accounting errors into domain error codes, and API routers
converted those domain codes into typed oRPC errors.

That produced duplicate policy across `packages/db` and `packages/api`, extra
`try/catch` on hot paths, broader public contracts than the client needed, and
more places where the real database failure could be hidden. The app is not in
production, so preserving legacy error contracts is lower value than keeping the
core simple and correct.

Midday's normal app routers call DB queries directly, and its DB queries throw
plain errors for failed invariants such as "not found". It only converts errors
in special router-owned cases where the transport layer intentionally exposes a
client-branching state such as conflict.

## Decision

Query, domain, cursor, and database failures fail fast. Routers return DB/query
calls directly unless they must shape output or make a router-owned decision.

Do not catch DB/query errors in routers or query helpers to convert them into
typed transport errors. Do not add shared `throwXDbError`, `catchXDbError`, or
Postgres-code mapping helpers for app routers.

Use oRPC `.errors(...)` only when the router owns an expected failure that the
client must branch on, such as auth/product-state decisions or health readiness.
Clients may branch only on errors declared by that router. Raw query/database
failures use generic client failure UI until a deliberate product policy exists.

Explicit domain guards inside query code remain valid when they express a real
business invariant and do not add failure-discriminator reads to hot mutation
paths. Atomic lifecycle predicates may collapse stale-tab, tamper, already
posted, already voided, and allocated-document misses into `NOT_FOUND` when the
single guarded write cannot distinguish them without another query. Invariants
that are available from the same statement or a required downstream operation
stay explicit, such as invalid void date, period closed, duplicate settlement
allocation target, and journal not balanced. Those errors are not automatically
transport contracts.

## Alternatives Considered

### Map every DB error into typed oRPC errors

- Pros: Client can show specific messages for duplicate names and constraint
  failures.
- Cons: Duplicates policy in DB and API, hides raw failures, expands public
  contracts before product behavior is settled, and adds `try/catch` around
  simple calls.
- Rejected: Too much complexity for a pre-production core.

### Convert errors only in query helpers

- Pros: Router code stays cleaner.
- Cons: Query package starts owning transport-shaped behavior and still hides
  database/cursor failures behind domain codes.
- Rejected: `packages/db` should not own transport semantics.

### Keep compatibility with legacy typed errors

- Pros: Less client churn.
- Cons: Preserves weak contracts before launch and makes future phases build on
  unnecessary fallback behavior.
- Rejected: Pre-AI phases prioritize a solid core over backward compatibility.

## Consequences

API routers are shorter and faster on normal paths. Query helpers expose the
real failure source. Core error enums shrink to business invariants that query
code explicitly throws.

Client UX loses some specific duplicate-name/account-mismatch messages until a
deliberate product validation policy is added. That is acceptable because GST,
posting, and document semantics need a clean core before polish-specific
error branches.

Future changes that need client-branching errors must document the product
reason, declare `.errors(...)` on the owning router, and avoid mapping raw DB
failures just to make the UI nicer.
