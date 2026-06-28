# Phase 02 Parties And Items Foundation Implementation Plan

Date: 2026-06-27
Status: Approved for implementation
Spec: `docs/superpowers/specs/2026-06-27-phase-02-parties-items-design.md`
Research: `docs/superpowers/specs/2026-06-27-phase-02-reference-architecture-research.md`

## Scope

Implement the Phase 2 foundation slice:

- Organization-scoped parties.
- Organization-scoped goods/services catalog.
- API procedures for list/create/update/deactivate.
- Owner UI screens for customers/vendors and goods/services.

Inventory is explicitly out of scope. No stock ledger, warehouse, quantity-on-hand, batch, serial, reorder, valuation, or COGS automation fields.

## Design Decisions

- Use one `party` table with `kind: customer | vendor | both`.
- Use one `item` table with `kind: goods | service`.
- Add `item.usage: sales | purchases | both`.
- Add optional item default rates: `sales_rate_minor`, `purchase_rate_minor`.
- Add optional item account defaults: `sales_account_id`, `expense_account_id`.
- Use `is_active` instead of hard delete for owner workflows.
- Keep search simple with organization-scoped `ILIKE`; defer full-text search.

## Implementation Steps

1. Core contracts
   - Add `packages/core/src/parties`.
   - Add `packages/core/src/items`.
   - Export both from `packages/core/src/index.ts`.
   - Add unit tests for enum validation, create/update inputs, list inputs, and DTO shapes.

2. Database schema
   - Add `packages/db/src/schema/parties.ts`.
   - Add `packages/db/src/schema/items.ts`.
   - Export new tables from `packages/db/src/schema/index.ts`.
   - Add relations if needed by local patterns.
   - Add migration.
   - Add schema tests for constraints and same-organization account references.

3. Database queries
   - Add party query functions: `listParties`, `createParty`, `updateParty`, `setPartyActive`.
   - Add item query functions: `listItems`, `createItem`, `updateItem`, `setItemActive`.
   - Enforce duplicate normalized names per organization.
   - Enforce item account references belong to same organization.
   - Add focused tests.

4. API
   - Add `packages/api/src/routers/parties/index.ts`.
   - Add `packages/api/src/routers/items/index.ts`.
   - Mount routers in `packages/api/src/routers/index.ts`.
   - Use `organizationPermissionProcedure` with accounting access until narrower parties/items permissions exist.
   - Map DB errors to typed API errors.

5. Web UI
   - Add organization routes:
     - `/$orgSlug/records/parties`
     - `/$orgSlug/records/items`
   - Add dense management pages with list, active filter, create/edit form, and deactivate/reactivate actions.
   - Add nav entries under records.
   - Use existing form-field, TanStack Query/oRPC, i18n, and UI component patterns.

6. Documentation
   - Update DB architecture docs after schema lands.
   - Update Phase 2 plan/status docs after implementation.

## TDD Order

1. Write failing core tests.
2. Implement core contracts.
3. Write failing DB/schema/query tests.
4. Implement schema and query functions.
5. Write failing API contract/router tests where local test harness exists; otherwise rely on typecheck plus DB query tests.
6. Implement API routers.
7. Add UI, then run full workspace check.

## Validation

Run:

- `rtk vp run --filter @tsu-stack/core test:unit`
- `rtk vp run --filter @tsu-stack/db test:unit`
- `rtk vp check`

Run DB integration after local Postgres is reachable:

- `rtk vp run --filter @tsu-stack/db test:integration`

## Commit Strategy

Use small commits:

1. Core contracts and tests.
2. DB schema/query layer and tests.
3. API routers.
4. UI screens and docs.
