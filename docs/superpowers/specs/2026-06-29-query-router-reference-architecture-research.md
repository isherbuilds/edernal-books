# Query and Router Reference Architecture Research

## Status

Research complete. Alternative B is the recommended Phase 2.5 implementation
shape. On this branch, the document contracts, document query modules, document
schema, and document routers described below are planning targets, not current
files.

## Date

2026-06-29

## Implementation Target

Alternative B should land with server-generated create-and-post ids, duplicate
settlement allocation targets rejected by validation and DB guards, partial
unique allocation target indexes, allocation target validation and locks batched
by kind, and document detail reads that avoid unnecessary sequential child
queries.

## Scope

- Planned code: `packages/db/src/queries`, with document-specific modules under
  a future `packages/db/src/queries/documents-query`.
- Planned API: `packages/api/src/routers`, with future `sales-documents`,
  `purchase-documents`, and `settlements` routers.
- References:
  - `midday-ai/midday` at `51587319f26a0ffaa9dfccab1920373cb65689b7`.
  - `frappe/erpnext` at `1a66fe9`.
  - Previous local architecture snapshot from the Edernal Books codebase.

## Orchestration Notes

- Codex 5.5 high worker `ref-midday-query` completed.
- Codex 5.5 high worker `ref-erpnext-accounting` completed.
- Codex 5.5 high worker `ref-local-temp` stalled without artifact. Coordinator
  replaced it with direct focused comparison against the previous local
  architecture snapshot.

## Decision Summary

Copy reference invariants, not reference frameworks.

Keep current repo direction:

- Thin oRPC routers.
- Tenant scope derived by organization middleware, not accepted from client.
- Query functions accept `db`/`tx` plus one input object.
- Router-owned typed errors only for client-branchable failures.
- Query, database, and unknown failures fail fast per ADR-0011.

Design the Phase 2.5 document internals to:

- Stop accepting `documentId` from create-and-post inputs. Generate document id server-side inside transaction.
- Reject duplicate settlement allocation targets instead of aggregating silently.
- Add database uniqueness for one settlement allocation per target document.
- Batch allocation validation and allocation updates by target kind where practical.
- Parallelize independent detail reads after parent document existence is known.
- Remove any catch-and-map query error policy if found during implementation.

Do not copy:

- Midday read-replica/cache policy.
- Midday nullable tenant assertions.
- ERPNext DocType lifecycle hook machinery.
- Temp repo app-wide idempotency ledger, service layer, or RLS transaction wrappers.
- Generic posting engine unless three posting flows become mechanically identical after simpler fixes.

## Current Repo Findings

### API Router Shape

The current branch does not yet contain split document routers. When Phase 2.5
adds `sales-documents`, `purchase-documents`, and `settlements`, that split is
the correct shape.

- Router validates the contract.
- Permission middleware derives `organizationId`.
- Handler passes `context.db`, `context.organizationId`, and
  `context.authSession.user.id` directly to DB query.
- No broad router `try/catch` or query error conversion belongs in these
  routers.

Keep this shape when the routers are added. Do not add a service layer just
because the prior local architecture had one.

### Client-Controlled Create-And-Post Ids

Future public schemas must not accept `documentId` for create-and-post:

- `CreateAndPostSalesDocumentInputSchema`.
- `CreateAndPostPurchaseDocumentInputSchema`.
- `CreateAndPostSettlementInputSchema`.

Draft creation should generate ids server-side:

- Sales draft uses `createUuidV7()`.
- Settlement draft uses `createUuidV7()`.

Create-and-post must not reuse a client id:

- Sales create-and-post allocates the id inside the transaction.
- Settlement create-and-post allocates the id inside the transaction.

Risk:

- Client can choose primary key.
- Idempotency uses `operationKey`; caller-owned id adds second replay dimension.
- Draft path and create-and-post path diverge for no useful reason.

Required change:

- Remove `documentId` from create-and-post schemas and DB input types.
- In each create-and-post transaction, allocate `const documentId = createUuidV7()`.
- Insert draft with generated id, then post same id.
- Keep post/void/update inputs accepting `documentId` because they target existing documents.

### Settlement Allocation Duplicates

Draft validation should reject duplicate target allocations:

- `assertAllocationTargetsBelongToParty` should detect repeated target ids.
- A repeated target must fail validation instead of incrementing the amount.

The planned schema needs uniqueness for one settlement allocation per target:

- `settlementAllocation` needs partial unique indexes per target kind.
- Generic org/id lookup indexes are not enough to enforce this invariant.

Risk:

- Duplicate target rows can exist in one settlement.
- Reads and audit show redundant allocation lines.
- Future partial void/reversal logic becomes harder.

Required change:

- Reject duplicate allocation targets in core schema refinement and DB guard.
- Add partial unique indexes:
  - `(organization_id, settlement_document_id, sales_document_id)` where `sales_document_id is not null`.
  - `(organization_id, settlement_document_id, purchase_document_id)` where `purchase_document_id is not null`.

### Allocation Validation And Application Query Count

Allocation application should avoid one read per allocation:

- Keep deterministic target ordering.
- Load sales targets in one batch.
- Load purchase targets in one batch.

Draft validation should also batch by unique target:

- Split allocations by target kind.
- Read each kind with one `inArray` query.

Risk:

- `N` allocations produce `N` selects and `N` updates.
- Lock order is per mixed target list. It sorts by target id/kind, which helps, but still causes repeated DB round trips.
- Duplicate aggregation hides client mistake.

Required change:

- Normalize allocations once.
- Split by target kind.
- Load sales targets in one `inArray` query and purchase targets in one `inArray` query.
- For mutation path, lock rows in deterministic order. Keep updates deterministic. One update per target is acceptable if batch `CASE` update becomes too complex.
- Validate party, posted status, and outstanding amount against loaded rows.

### Detail Reads

Detail reads should avoid unnecessary sequential parent/child work:

- Sales: parent and lines.
- Purchase: parent and lines.
- Settlement: parent and allocations.

Required change:

- Keep parent existence guard.
- After parent exists, independent child reads can stay one extra query.
- If parent and lines are independent and query semantics accept `not found` from parent only, run `Promise.all([selectParent, loadChildren])` then guard parent.
- Do not parallelize transactional mutation locks.

### Query Error Policy

Current document query package has `DocumentDbError`.
This is acceptable only for domain guard failures like not found, already posted, allocation invalid, period closed, and operation-key mismatch.

Rules:

- Do not catch Drizzle/Postgres errors and translate them.
- Do not wrap unknown failures in transport errors.
- Keep ADR-0011 intact.

## Reference Findings

### Midday

Useful patterns:

- Thin routers call domain/query functions directly.
- Tenant context is middleware-owned.
- Query functions stay small and projection-specific.
- Activity/audit writes are awaited inside mutation flow.
- No generic transaction orchestration layer for simple flows.

Do not copy:

- Read replica/cache split.
- Offset pagination where current keyset cursor exists.
- Nullable tenant assertions.
- Fire-and-forget activity writes.

Local adoption:

- Current router shape already matches best part.
- Use Midday as argument against adding temp-style services.

### ERPNext

Useful patterns:

- Document lifecycle is explicit: validate, submit/post, cancel/void.
- Payment allocation validates target belongs to party/account and is not over-allocated.
- Latest outstanding state is checked in transaction before allocation.
- Official numbers are server-owned.

Do not copy:

- DocType hook framework.
- Dynamic GL composer.
- Broad exception-oriented control flow.
- Company/accounting dimension machinery beyond current need.

Local adoption:

- Keep explicit Drizzle transactions.
- Keep server-owned official document numbers.
- Strengthen settlement duplicate target behavior and outstanding checks.

### Temp Edernal Books

Useful patterns:

- Procedures are thin: permission, schema, one service call.
- Mutations carry an operation key.
- Business writes happen in one explicit transaction.
- `payments.ts` create path accepts no client document id; DB/server creates document id.
- `ledger.ts` locks settlement open items in one ordered query.

Do not copy:

- `withOrgTx`/`withOrgRead` RLS transaction wrapper; current repo derives tenant scope in API and passes explicit `organizationId`.
- App-wide idempotency ledger middleware; current operation-key uniqueness is smaller and enough for document posting/voiding.
- Service layer. Current `packages/db` query module is already the boundary.
- ORPCError in services/queries. Current ADR requires DB/query failures fail fast and router-owned typed errors only where client must branch.

Local adoption:

- Reuse server-generated ids for create-and-post.
- Reuse ordered batched lock/read idea for settlement allocation targets.
- Keep routers thin.

## Alternatives

### Alternative A: Minimal Hot-Path Deslop

Edits:

- Remove create-and-post `documentId` from public schemas.
- Generate create-and-post document ids server-side.
- Parallelize detail reads only.

Pros:

- Smallest change.
- No migration.
- Removes direct client primary-key control.

Cons:

- Duplicate settlement allocations remain possible.
- Allocation query count remains high.

Use if time is tight.

### Alternative B: Focused Owner-Document Hardening

Edits:

- Alternative A.
- Reject duplicate settlement allocation targets in core and DB guard.
- Add partial unique indexes for settlement allocation targets.
- Batch allocation target validation by kind.
- Batch/order mutation locks by kind, then update deterministic rows.
- Update docs/ADRs.

Pros:

- Best balance of smaller code, speed, and correctness.
- Targets current defects without new architecture.
- Matches Midday thin-boundary style and ERPNext latest-state validation.

Cons:

- Requires migration generation.
- Touches tests across core and DB.

Recommended.

### Alternative C: Temp-Style Idempotency Middleware And Service Layer

Edits:

- Add idempotency ledger table and middleware.
- Move mutations from `packages/db` queries into API services.
- Thread operation context through services.

Pros:

- Strong generic HTTP retry model.
- Clear if external OpenAPI clients become primary use case.

Cons:

- Adds layer and table before need.
- Conflicts with current package-boundary docs.
- Reintroduces query/service error mapping risk.
- Slower to finish pre-production owner workflow.

Reject for now.

### Alternative D: Generic Posting Engine

Edits:

- Abstract sales, purchase, and settlement posting into shared posting engine.
- Centralize journal creation, audit, and document status updates.

Pros:

- Could reduce duplicated posting code later.

Cons:

- Current flows differ in meaningful ways.
- Generic engine likely hides money/accounting policy in callbacks.
- Large blast radius before current behavior is stable.

Defer. Revisit only after B lands and duplicated code remains mechanical.

## Recommended Implementation Brief

Implement Alternative B in slices:

1. Contract/id slice:
   - Remove `documentId` from `CreateAndPostSalesDocumentInputSchema`, `CreateAndPostPurchaseDocumentInputSchema`, and `CreateAndPostSettlementInputSchema`.
   - Update DB input types.
   - Generate `documentId = createUuidV7()` inside create-and-post transactions.
   - Update contract tests and web callers.

2. Duplicate allocation slice:
   - Add `noDuplicateSettlementAllocationTargets` refinement near settlement schema.
   - Change DB allocation normalization to throw on duplicate target instead of summing.
   - Add partial unique indexes to `settlementAllocation`.
   - Generate migration with Vite Plus if schema changed.

3. Allocation query-count slice:
   - Replace per-target validation reads with one sales query and one purchase query.
   - For apply path, lock targets in deterministic order by kind/id.
   - Keep one update per target unless a readable `CASE` update is simpler.

4. Read-model slice:
   - Parallelize independent detail reads or keep parent-first if tests show no win.
   - Do not parallelize mutation locks.

5. Docs slice:
   - Update `docs/decisions/0008-document-lifecycle.md`.
   - Update `docs/decisions/0010-allocate-document-numbers-on-post.md` if create-and-post id ownership is mentioned.
   - Update `docs/decisions/0011-fail-fast-query-errors.md` only if wording needs clarification; do not weaken it.
   - Update `packages/db/ARCHITECTURE.md` and `packages/api/ARCHITECTURE.md` if package boundary language changes.

## Validation Targets

- `vp --filter @tsu-stack/core test -- documents`
- `vp --filter @tsu-stack/db test -- documents`
- `vp --filter @tsu-stack/api check`
- `vp run -w fix`

If schema migration generated:

- Inspect migration SQL manually.
- Verify partial unique indexes match nullable target columns.

## Reviewer Checklist

- No `documentId` in create-and-post public input.
- No API router catch-and-map block for query/DB errors.
- No `any`, broad casts, or non-null assertions added.
- No app-wide service layer introduced.
- No generic idempotency ledger introduced.
- Settlement duplicate target rejected before insert and enforced by DB.
- Allocation target validation uses batched reads.
- Mutation locks remain deterministic.
- Docs reflect chosen behavior, not reference-repo history.
