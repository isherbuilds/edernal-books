# AI-Native Accounting Plan Set

Date: 2026-06-16

Updated: 2026-06-17.

Source spec: `docs/superpowers/specs/2026-06-16-ai-native-accounting-foundation-design.md`

Schema amendment: `docs/superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md`

Decision record: `docs/decisions/0001-accounting-foundation-spine.md`

## Plan Files

- `docs/superpowers/plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-02-owner-workflow-mvp-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-03-india-gst-core-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-04-bank-reconciliation-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-05-ai-assistant-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-06-platform-api-integrations-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-07-service-smb-expansion-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-08-accountant-mode-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-09-trade-inventory-import-export-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phase-10-country-tax-engine-detailed-plan.md`
- `docs/superpowers/plans/2026-06-16-phases-02-10-roadmap-plans.md`
- `docs/superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md`

## Execution Order

1. Phase 0: Platform Foundation.
2. Phase 1: Accounting Kernel.
3. Phase 2: Owner Workflow MVP.
4. Phase 3: India GST Core.
5. Phase 4: Bank and Reconciliation.
6. Phase 5: AI Assistant.
7. Phase 6: Platform API and Integrations.
8. Phase 7: Service SMB Expansion.
9. Phase 8: Accountant Mode.
10. Phase 9: Trade, Inventory, Import, Export.
11. Phase 10: Country-Agnostic Tax Engine.

## Foundation Vocabulary

Use these names across all plans:

- `organization_setting`, not `business_profile`.
- `ledger_account`, not `account_group` plus `account`.
- `journal_batch` and `journal_line`, not a simple `journal` table.
- `audit_event`, not `audit_log`.
- `outbox_event`, not `internal_event`.
- `idempotency_ledger`, not a simple idempotency ledger table.
- `number_sequence`, not document-specific sequence tables.
- `source_document` as the common document-to-ledger traceability shell.

## Plain-Language Glossary

Use these meanings when reading or implementing the plans:

- `organization`: Better Auth's word for a business tenant. In the UI, call it "Business".
- `tenant`: one isolated business's data. A user may belong to many tenants, especially accountants.
- `organization_id`: the column that marks which business owns a row.
- `RLS`: PostgreSQL row-level security. It prevents one business from reading or changing another business's rows even if application code has a bug.
- `rls-inventory`: a security inventory of database tables that checks RLS coverage. It is not product inventory, stock, warehouses, or goods movement.
- `app.current_org_id`: a per-transaction PostgreSQL setting used by RLS policies to know the active business.
- `withOrgTx`: runs database writes inside a transaction after setting `app.current_org_id`.
- `withOrgRead`: read-only equivalent of `withOrgTx`; it still sets the business context for RLS.
- `withOrgSnapshotRead`: a read wrapper reserved for consistent report/export reads. "Snapshot" here means a stable database view during the transaction, not an inventory snapshot.
- `Better Auth-owned table`: a table generated and managed by Better Auth, such as `user`, `session`, `organization`, `member`, or `invitation`.
- `app-owned table`: a table owned by this accounting app, such as `organization_setting`, `journal_batch`, or `invoice`.
- `global reference table`: shared lookup data that is not owned by one business, such as `currency`.
- `audit_event`: durable record that a sensitive action happened, who did it, and what changed.
- `outbox_event`: a queued domain event written in the same database transaction as the business change, then processed later by jobs, webhooks, AI indexing, or integrations.
- `idempotency_ledger`: request replay protection. It makes repeated create/post requests with the same key return the same result instead of creating duplicates.
- `source_document`: shared document header used to connect invoices, expenses, payments, and other business documents to accounting postings.
- `journal_batch`: one accounting posting operation.
- `journal_line`: one debit or credit line inside a `journal_batch`.
- `number_sequence`: the per-business counter that allocates journal, invoice, receipt, and other document numbers.
- `minor units`: integer money storage, such as paise/cents. INR 123.45 is stored as `12345`, avoiding floating-point rounding bugs.
- `normal balance`: whether an account normally increases by debit or credit.
- `control account`: a ledger account controlled by another workflow, such as Accounts Receivable from invoices, rather than casual manual journal entry.
- `reconcilable account`: an account expected to be matched against statements or subledgers, such as bank or receivables.
- `reversal`: correcting an accounting posting by creating a new opposite posting instead of editing history.
- `subledger`: detailed customer/vendor/payment records that explain a control account balance.
- `settlement` or `allocation`: linking a receipt/payment amount to one or more invoices/bills.
- `OpenAPI snapshot`: a test fixture of the API schema used to detect accidental API changes. It is unrelated to stock inventory.
- `report snapshot`: an immutable saved copy of a report/export at a point in time.
- `MCP`: Model Context Protocol; future integration surface for AI/tools, not part of Phase 0/1.
- `inventory` or `stock ledger`: actual stock/goods tracking. This starts in Phase 9 and is unrelated to `rls-inventory`.

## Repo Baseline

- Use `@tsu-stack/*` package names.
- Use `packages/core` for shared contracts and pure helpers.
- Use `packages/db` for schema/migrations/transaction helpers.
- Use `packages/auth` for Better Auth config.
- Use `packages/api` for Hono/oRPC routers.
- Use `apps/web` for TanStack Start UI.
- Use Vite Plus commands through root scripts.

Do not introduce `packages/domain`, `packages/shared`, or `@app/*` imports as part of these plans.

## Core Rule

Phase 0 and Phase 1 are foundation phases. They should be implemented slowly, tested heavily, and kept small enough to reason about.

No invoice, expense, GST filing, bank reconciliation, AI assistant, public API, MCP, webhook delivery, recurring workflow, inventory, import/export, or country-pack work should begin until Phase 0 and Phase 1 are stable.

## Phase Gate

Before moving beyond Phase 1:

- Auth and organization membership work.
- `organization_setting` exists for each business.
- Role checks are server-enforced.
- `audit_event` records sensitive mutations.
- `outbox_event` rows are written transactionally.
- `idempotency_ledger` prevents duplicate posting.
- App-owned tenant tables have RLS and organization policies.
- Fiscal years and accounting periods exist.
- `ledger_account` chart exists.
- `number_sequence` exists.
- `source_document` minimal shell exists.
- `journal_batch` and `journal_line` exist.
- Posted batches are immutable.
- Reversals create separate batches.
- Trial balance balances.
- Accounting-core tests pass.
- Phase 1 does not include `party`, `tax_code`, owner documents, subledger, or balance-cache tables.
