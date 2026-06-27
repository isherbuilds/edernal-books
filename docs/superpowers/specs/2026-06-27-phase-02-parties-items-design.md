# Phase 02 Parties And Items Foundation Design

Date: 2026-06-27
Status: Draft for review
Roadmap phase: Phase 02 - owner workflow MVP

## Context

Phase 0 and Phase 1 are complete on `main`. The current accounting kernel has chart-of-accounts, fiscal years, journal entries, immutable posted journal lines, and tenant-scoped accounting reads/writes.

Phase 2 should now move from ledger primitives into owner-facing workflow foundations. The first Phase 2 slice should add reusable customers, vendors, goods, and services before invoice or expense document posting begins.

Local database integration verification is still a required Phase 2 gate before schema work starts. The latest local run failed because Postgres was not accepting connections on `127.0.0.1:5432` / `::1:5432`, not because of an assertion failure.

## Decision

Start Phase 2 with parties and item/service catalog foundation.

Do not build stock inventory in this phase. Phase 2 may classify catalog entries as `goods` or `service`, but it must not track quantity on hand, warehouses, stock movements, cost layers, purchase orders, sales orders, or COGS automation. Full inventory remains Phase 9 scope.

Reference review supports one extra modeling split: item `kind` and item `usage` should be separate. `kind` captures whether the catalog entry is a good or service. `usage` captures whether it can be used for sales, purchases, or both. This mirrors Frappe Books and ERPNext without bringing their inventory modules into Phase 2.

## Goals

- Let owners create, edit, list, and deactivate customers and vendors.
- Let owners create, edit, list, and deactivate goods and services used by later sales and purchase documents.
- Keep all records organization-scoped.
- Preserve simple owner language in the UI: customers, vendors, goods, services.
- Build contracts and storage that invoice and expense workflows can reuse without another schema redesign.

## Non-Goals

- No invoice creation, posting, numbering, PDF, payment, or GST workflow.
- No expense bill posting.
- No inventory ledger, warehouse model, stock valuation, or quantity-on-hand reporting.
- No GSTIN, PAN, e-invoicing, e-way bill, TDS, or tax calculation.
- No public import/export workflow.
- No cross-organization shared contacts or global item catalog.

## Domain Model

### Party

A party represents an organization-scoped customer, vendor, or both.

Suggested fields:

- `id`
- `organization_id`
- `kind`: `customer`, `vendor`, or `both`
- `display_name`
- `normalized_name`
- `legal_name`
- `email`
- `phone`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `is_active`
- `created_at`
- `updated_at`

Constraints:

- `organization_id` is required.
- `display_name` is required.
- `(organization_id, normalized_name)` should be unique.
- Deactivation should preserve historical references.
- Hard delete should not be exposed through owner workflow APIs.

### Item

An item represents an organization-scoped good or service catalog entry.

Suggested fields:

- `id`
- `organization_id`
- `kind`: `goods` or `service`
- `usage`: `sales`, `purchases`, or `both`
- `name`
- `normalized_name`
- `description`
- `unit`
- `sales_rate_minor`
- `purchase_rate_minor`
- `sales_account_id`
- `expense_account_id`
- `is_active`
- `created_at`
- `updated_at`

Constraints:

- `organization_id` is required.
- `name` is required.
- `(organization_id, normalized_name)` should be unique.
- `sales_rate_minor` and `purchase_rate_minor` are optional non-negative minor-unit amounts in the organization base currency.
- `sales_account_id` and `expense_account_id` are optional Phase 2 foundations for later document posting.
- Account references, when present, must point to accounts in the same organization.
- No item field should imply stock tracking in Phase 2.

Do not add `track_inventory`, `maintain_stock`, `warehouse_id`, `quantity_on_hand`, batch, serial number, valuation, reorder, or manufacturing fields in Phase 2.

## Core Contracts

Add shared Zod contracts under `packages/core` for:

- Party kind, item kind, and item usage enums.
- Party create, update, list query, and DTO schemas.
- Item create, update, list query, and DTO schemas.
- Shared normalization policy for duplicate-name checks if the existing core patterns support it.

Keep contracts narrow. Avoid local duplicated DTOs in API or UI packages.

## Database

Add Drizzle tables for parties and items in the DB package.

Expected database work:

- Add enum or text constraints for party kinds, item kinds, and item usage values.
- Add organization foreign keys.
- Add optional same-organization account references for item account defaults.
- Add indexes for organization-scoped list queries.
- Add unique constraints for exact normalized duplicate names inside an organization.
- Add migration and update DB architecture docs after implementation.

Before applying migrations, rerun the DB integration gate with a reachable local Postgres instance.

## API

Add organization-scoped procedures for:

- `parties.list`
- `parties.create`
- `parties.update`
- `parties.setActive`
- `items.list`
- `items.create`
- `items.update`
- `items.setActive`

Use existing organization-scoped API middleware and typed errors. Procedures must not accept an arbitrary organization id from untrusted input when the current route/session context already defines scope.

## UI

Add owner workflow screens after API and data access are in place:

- Customers/vendors management screen.
- Goods/services catalog screen.
- Sales/purchase usage control on item forms.
- Create/edit form for each record type.
- Active/inactive list filtering.

The UI should avoid inventory wording. Use catalog language until Phase 9.

## Testing

Follow TDD for implementation:

- Core schema tests for validation and enum behavior.
- DB schema/query tests for tenant scoping, duplicate-name constraints, active filtering, and account ownership checks.
- API tests for create/list/update/deactivate behavior and cross-organization rejection.
- UI tests only where workflow behavior has meaningful risk.

Run at minimum:

- `rtk vp check`
- focused package tests for changed packages
- DB integration tests once local Postgres is available

## Phase 2 Follow-Up Slices

After this foundation lands:

1. Sales invoice draft model and UI.
2. Invoice posting into journal entries.
3. Expense/bill capture and posting.
4. Payment allocation and basic receivables/payables views.
5. GST and compliance fields after plain workflow is stable.

## Open Review Points

- Confirm Phase 2 item account defaults should be added now as optional fields, instead of delaying all account mapping until invoice posting.
- Confirm optional item sales/purchase default rates should be included in this foundation slice.
