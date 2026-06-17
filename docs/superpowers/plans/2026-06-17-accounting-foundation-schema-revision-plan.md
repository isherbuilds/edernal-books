# Accounting Foundation Schema Revision Plan

Date: 2026-06-17

Status: Accepted source of truth for foundation schema and plan vocabulary.

Reference only: `/Users/docbook/edernal-company/temp-edernal-books`.

Decision record: `docs/decisions/0001-accounting-foundation-spine.md`.

## Purpose

Use the stronger accounting spine found in the reference repo without copying its full future-phase schema into Phase 0/1.

The right direction is:

- Keep the product sequence already planned: platform, ledger kernel, owner workflows, GST, bank, AI, integrations.
- Adopt durable foundation names: `organization_setting`, `ledger_account`, `journal_batch`, `source_document`, `number_sequence`, `audit_event`, `outbox_event`, `idempotency_ledger`.
- Keep Phase 0/1 small. Do not add tables or fields until a phase has a service that writes and reads them.

## Terminology Notes

- `rls-inventory` is a security checklist for table-level RLS coverage. It is not the inventory/stock module.
- `withOrgSnapshotRead` is a tenant-scoped read helper for reports/exports that should see one stable database view. It does not mean a saved organization profile snapshot.
- `snapshot` has three meanings in these plans: database read consistency, immutable report/export copies, and OpenAPI schema snapshot tests. None of those meanings is stock inventory.
- `organization` is Better Auth's internal term for a business tenant. Product UI should say "Business".
- `outbox_event`, `audit_event`, and `idempotency_ledger` are infrastructure tables. They are included early because they protect correctness, replay behavior, and traceability before invoices/GST/bank/AI features exist.

## Decisions

### D1: Identifier Strategy

Do not force Better Auth to use UUID-v7 IDs in this repo.

Why:

- Current generated Better Auth tables use text IDs.
- Forcing UUID-v7 would turn a planning cleanup into an auth schema migration.
- App-owned foreign keys that reference Better Auth tables must match the generated Better Auth column type.

Rules:

- Better Auth-owned IDs keep the type Better Auth generates.
- In this repo today, generated Better Auth IDs are text.
- `organization_id` and `user_id` columns that reference Better Auth tables use text unless the generated Better Auth schema changes in a separate migration decision.
- App-owned accounting table primary keys may use UUID-v7, but tenant foreign keys that point to Better Auth stay aligned with Better Auth IDs.
- RLS compares `organization_id` as text. Do not cast `app.current_org_id` to UUID in this repo.

### D2: Money

Store ordinary money as integer minor units:

- `*_minor bigint` for money amounts.
- `numeric(20, 10)` for exchange rates.
- `numeric(9, 4)` for tax rates.
- `numeric(18, 4)` for quantities.

Why:

- Minor units avoid JavaScript floating-point drift.
- Decimal strings stay at input/output boundaries only.
- Tax rates, quantities, and exchange rates still need decimal precision.

### D3: Idempotency

Use exactly one request-boundary idempotency authority: `idempotency_ledger`.

Rules:

- `idempotency_ledger` stores request hash, lock state, terminal response, expiry, and replay metadata.
- `journal_batch.operation_key` is a domain uniqueness guard for posting retries.
- `source_document` does not get an `idempotency_key` column.

Why:

- Duplicate protection belongs at the service/API boundary.
- Multiple idempotency mechanisms create conflicting replay behavior.

### D4: RLS Boundary

Apply RLS to app-owned tenant tables from their first migration.

Rules:

- Better Auth-owned tables are excluded from app tenant RLS inventory.
- App-owned tenant tables have `organization_id`, RLS enabled, and an organization isolation policy.
- Service reads/writes use `withOrgTx`, `withOrgRead`, or `withOrgSnapshotRead` and set `app.current_org_id`.
- The runtime database role must not own tenant tables and must not bypass RLS.

Policy shape:

```sql
organization_id = nullif(current_setting('app.current_org_id', true), '')
```

Verification must prove every active app-owned tenant table has `organization_id`, RLS enabled, an organization isolation policy, and a runtime database role that neither owns tenant tables nor bypasses RLS.

### D5: Phase-Owned Migrations

Use `packages/db/src/schema/migration.ts` as the active migration boundary.

Rules:

- A table is not shipped until it is exported from `schema/migration.ts`.
- Future draft schema files may exist only if clearly marked as future-phase drafts.
- RLS inventory verifies active migration tables, not every experimental schema export.
- Phase plans must not add future-phase tables to the migration entrypoint early.

## Phase Ownership

### Phase 0: Platform Foundation

Add:

- Better Auth organization/member/invitation/API-key support.
- `organization_setting`.
- `currency`.
- `audit_event`.
- `outbox_event`.
- `idempotency_ledger`.
- RLS transaction helpers and verification.

Do not add:

- `party`.
- `tax_code`.
- document subtype tables.
- bank/reconciliation tables.
- webhook delivery tables.
- AI tables.

### Phase 1: Accounting Kernel

Add:

- `fiscal_year`.
- `accounting_period`.
- `ledger_account`.
- `number_sequence`.
- minimal `source_document`.
- `journal_batch`.
- `journal_line`.

Do not add:

- `party`.
- `tax_code`.
- `tax_code_component`.
- invoice/bill/payment tables.
- subledger/settlement tables.
- balance cache tables.

Why:

- The journal kernel can post opening balances and manual/advanced entries without parties or taxes.
- Party and tax columns would be nullable placeholders until Phase 2/3.
- Adding nullable placeholders early weakens schema clarity and creates migrations before behavior exists.

### Phase 2: Owner Workflow MVP

Add:

- `party`.
- `item`.
- owner documents: invoice, expense/bill, receipt, payment.
- document subtype tables that link to `source_document`.
- subledger/settlement/allocation tables.
- document attachments and delivery logs.

Use existing foundation:

- `number_sequence` allocates document numbers.
- posted documents create `journal_batch` rows.
- document services write `audit_event` and `outbox_event`.
- posting replay uses `idempotency_ledger`.

### Phase 3: India GST Core

Add:

- `tax_code`.
- `tax_code_component`.
- GST settings/details/line tax summaries.
- credit/debit note support.
- GST report snapshots/exports.

Why tax starts here:

- Phase 2 can create tax-ready document shapes, but GST correctness needs state, registration, HSN/SAC, place-of-supply, and component split rules.
- Keeping tax out of Phase 1 prevents a pretend tax foundation with no owner workflow consumer.

### Later Phases

- Phase 4 adds bank statement import and reconciliation.
- Phase 5 adds AI suggestion/explanation tables only after deterministic services exist.
- Phase 6 adds public API, integrations, webhook delivery, external references, and MCP.
- Phase 7 adds recurring/service-SMB workflows.
- Phase 8 adds accountant review/adjustment workflow metadata.
- Phase 9 adds inventory/trade/import/export and full FX behavior.
- Phase 10 adds country tax localization packs.

## Table Decisions

### `organization_setting`

One app-owned row per Better Auth organization.

Phase 0 fields:

- `organization_id`.
- `legal_name`.
- `trade_name`.
- `country_code`.
- `base_currency_code`.
- `timezone`.
- `fiscal_year_start_month`.
- `books_start_date`.
- `primary_email`.
- `primary_phone`.
- `created_at`.
- `updated_at`.

Defer:

- PAN, GSTIN, and GST registration details to Phase 3.
- invoice profile fields to Phase 2.
- feature flags to an explicit feature/config table when there is a consumer.
- approval mode until a real approval workflow exists.
- registered address split until documents need formatted addresses.

### `ledger_account`

Use one hierarchical chart table instead of `account_group` plus `account`.

Keep:

- hierarchy.
- account category/type.
- normal balance.
- system key.
- group/posting distinction.
- control/reconcilable flags.
- manual posting flag.

Why:

- Separate account groups are too weak for posting rules.
- A single table handles system accounts, groups, leaf accounts, and future bank/control behavior.

### `source_document`

Phase 1 shell fields:

- `id`.
- `organization_id`.
- `type`.
- `document_number`.
- `status`.
- `date`.
- `posting_date`.
- `currency_code`.
- `exchange_rate`.
- `grand_total_minor`.
- `base_grand_total_minor`.
- `reference`.
- `notes`.
- `created_by`.
- `posted_at`.
- `created_at`.
- `updated_at`.

Defer:

- raw idempotency keys forever; request replay belongs in `idempotency_ledger`.
- `party_id` until Phase 2.
- approval lifecycle until Phase 2 or later.
- snapshots/render context until PDFs and delivery exist.
- outstanding/allocation fields until payments and subledger exist.

### `journal_batch` and `journal_line`

`journal_batch` represents one posting operation. `journal_line` represents balanced debits and credits.

Keep in Phase 1:

- batch number.
- posting date.
- accounting period link.
- source document link.
- operation key.
- idempotency ledger link.
- reversal link.
- status.
- posted metadata.
- line account, debit/credit minor units, currency, exchange rate, description.

Defer:

- `party_id` on lines until Phase 2.
- `tax_code_id` on lines until Phase 3.
- dimensions until there is a reporting requirement.

## Naming Replacements

Use these replacements everywhere in docs and implementation:

- `business_profile` -> `organization_setting`.
- `account_group` + `account` -> `ledger_account`.
- simple `journal` table -> `journal_batch`.
- `internal_event` -> `outbox_event`.
- `audit_log` -> `audit_event`.
- `idempotency_key` table -> `idempotency_ledger`.
- `number_sequence` -> `number_sequence`.
- `journal_batch_id` -> `journal_batch_id` or `source_document_id`, depending on direction.

## Repo Fit

This repo is `tsu-stack`, not a fresh `@app/*` scaffold.

Plan files must use:

- package imports under `@tsu-stack/*`.
- shared schemas/contracts in `packages/core`.
- API/router code in `packages/api`.
- database schema in `packages/db`.
- web UI in `apps/web`.
- Vite Plus commands (`vp`) through the root scripts where possible.

Do not introduce `packages/domain` or `packages/shared` unless a later architecture decision explicitly creates them.

## Review of Other Agent Plan

The other agent's June 17 direction makes sense at the accounting-spine level:

- stronger `ledger_account`;
- `journal_batch` as posting unit;
- `source_document` as traceability backbone;
- outbox/idempotency/audit from day one;
- RLS as a real tenant boundary.

Changes needed before using it:

- remove forced Better Auth UUID-v7 assumption;
- keep Better Auth ID types generated by this repo;
- move `party` from Phase 1 to Phase 2;
- move `tax_code`/`tax_code_component` from Phase 1 to Phase 3;
- slim `organization_setting`;
- slim Phase 1 `source_document`;
- remove `party_id`, `tax_code_id`, and dimensions from Phase 1 journal lines;
- align package paths and commands to `tsu-stack`.

## Verification Checklist

- [ ] Docs say `organization == business`.
- [ ] App-owned settings live in `organization_setting`.
- [ ] No `business_entity` table in Phase 0/1.
- [ ] No forced Better Auth UUID-v7 migration.
- [ ] `organization_id` references Better Auth IDs as text in this repo.
- [ ] RLS policy compares text IDs and does not cast to UUID.
- [ ] Runtime database role cannot own tenant tables or bypass RLS.
- [ ] Active migrations export only current phase-owned tables.
- [ ] Phase 1 uses `ledger_account`.
- [ ] Phase 1 uses `journal_batch`.
- [ ] Phase 1 includes `accounting_period`.
- [ ] Phase 1 includes minimal `source_document`.
- [ ] Phase 1 excludes `party`.
- [ ] Phase 1 excludes `tax_code` and `tax_code_component`.
- [ ] Money uses minor units.
- [ ] `outbox_event` replaces `internal_event`.
- [ ] `audit_event` replaces `audit_log`.
- [ ] `idempotency_ledger` replaces simple idempotency-key tables.
- [ ] `number_sequence` replaces document-specific sequence tables.
- [ ] Later plans reference this amendment before execution.
