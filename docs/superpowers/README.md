# Accounting Planning Hub

This directory contains the execution planning set for the Edernal Books
accounting product. These files are intentionally detailed because agents use
them as implementation instructions.

## Read Order

1. [Foundation design spec](specs/2026-06-16-ai-native-accounting-foundation-design.md)
2. [Plan set index](plans/2026-06-16-plan-set-index.md)
3. [Schema revision source of truth](plans/2026-06-17-accounting-foundation-schema-revision-plan.md)
4. Phase plan for the current task. For documents, use
   [Phase 02.5 Document Spine](plans/2026-06-28-phase-02-5-document-spine-plan.md).
5. [ADR-0001](../decisions/0001-accounting-foundation-spine.md)

## Current Status

Updated: 2026-06-29.

Source-document update: [ADR-0012](../decisions/0012-replace-source-document-with-journal-source-metadata.md)
removes the `source_document` table. Historical plan references to
`source_document` now mean journal source metadata on `journal_entry` plus typed
documents' `journal_entry_id` links.

Phase 0 and Phase 1 code are complete on `main`. Phase 0 landed:

- Better Auth organization plugin and generated organization/member/invitation schema.
- DB client split into `client.ts`, `migrate.ts`, reusable queries, schema files, and health helpers.
- App-owned foundation tables: `organization_setting`, `currency`, `exchange_rate`, `audit_event`, and `outbox_event`.
- UUID-v7 runtime defaults for app-owned UUID primary keys.
- oRPC auth context, `organizationProcedure`, membership verification by `orgSlug`, and organization settings get/upsert procedures.
- Organization settings writes return a small success envelope and write audit rows in the same DB transaction.
- Fresh baseline migration covers schema only. Supported currency reference rows are managed through a separate seed/admin path, not Drizzle schema generation.
- Web organization setup at `/organizations/new` creates/selects a business by slug.
- Web business settings at `/$orgSlug/settings/business` reads and writes `organization_setting`.
- Auth package exports Phase 0 role permission helpers with unit tests.
- Unit tests cover role permissions, organization membership resolution, settings audit rows, and schema tenant-scope invariants.

Phase 1 landed:

- `packages/core/src/accounting` default chart, journal validation, report arithmetic, and oRPC-safe DTOs that serialize minor units as strings.
- `fiscal_year`, `accounting_period`, `ledger_account`, `number_sequence`,
  historical `source_document`, `journal_entry`, and `journal_line`.
- Composite tenant foreign keys on accounting references.
- Service rules plus PostgreSQL constraints for posted journal invariants, posting balance/date validation, and accounting foundation settings lock. Add database triggers later only when a real bypass path or public/integration writer needs that hardening.
- Accounting API procedures for fiscal-year setup, default chart seed, post, and reverse.
- SQL-backed accounting report readers and API procedures for as-of trial balance and account-scoped general ledger.
- Posting writes `journal_entry`, `journal_line`, and awaited transactional `audit_event`.
- Posting does not write `outbox_event` until a durable async/public/integration consumer exists.
- `number_sequence` allocation uses atomic `UPDATE ... RETURNING`.
- DB integration tests cover concurrent sequence allocation, fiscal-year sequence reset, rollback semantics, posting date checks, reversal behavior, and settings locks.
- Web accounting surfaces exist for chart of accounts, accounting periods, manual/opening journal posting, reversal, journal register, trial balance, and general ledger.
- Owner/accountant accounting access is explicit; viewer has no accounting-kernel report or action access by default.

Current deliberate gap: `outbox_event` exists, but Phase 1 does not emit outbox rows because no worker/webhook/public API/integration/async consumer exists.

Current idempotency decision: request ids are for tracing only. Phase 0 does
not keep a generic `idempotency_ledger`; natural upserts use natural keys, and
internal accounting commands use direct transactions plus domain constraints.
Existing document post and void commands lock rows and reject stale
statuses. Create-and-post does not replay retried requests in this phase.
Reconsider a central replay store only when Phase 6 public API semantics need
heterogeneous response replay.

Phase 2 parties/items foundation exists in code and the 2026-06-28 local gate
drift was repaired: Paraglide generated messages were refreshed, DB integration
now runs the intended tests, and party/item PostgreSQL error unwrapping handles
Drizzle-wrapped errors.

Phase 2.5 document spine is implemented as the bridge to Phase 3:

- Core contracts cover create/update draft, get/list, post, void, lifecycle
  statuses, document kinds, settlement directions, payment modes, and DTOs.
- DB owns typed tables for `sales_document`, `purchase_document`,
  `settlement_document`, lines, allocations, lifecycle metadata, official
  document numbers, and status transitions.
- Posting creates a balanced `journal_entry` with source metadata and
  `audit_event` in one transaction.
- Owner UI provides sales/purchase document registers, draft editors, read-only
  detail pages, posting, voiding, and settlement allocations. PDF/share
  rendering remains a later UI slice.
- Settlement allocation total must equal settlement amount. Advances/unallocated
  money wait for a separate accounting contract.
- Line-item order follows entry order. Editors support add/remove only, not
  drag or reorder controls.
- Line rate stays directly editable after item selection. Discount percent,
  discount amount, and discount account behavior are deferred to Phase 3 GST/tax
  core so taxable base, tax breakup, and journal postings share one contract.

Next step:

- Start Phase 3 GST Core from posted documents, not draft UI state.
- Attach GST settings, tax lines, credit/debit notes, and GST reports without
  replacing the document lifecycle.
- Keep PDF/share/email delivery, AI assistant, bank reconciliation, public API,
  recurring workflows, and inventory outside the Phase 3 GST core unless a
  Phase 3 task explicitly needs a narrow support hook.

## Phase Plans

| Phase                            | Plan                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00 Platform Foundation           | [plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md](plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md)         |
| 01 Accounting Kernel             | [plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md](plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md)             |
| 02 Owner Workflow MVP            | [plans/2026-06-16-phase-02-owner-workflow-mvp-detailed-plan.md](plans/2026-06-16-phase-02-owner-workflow-mvp-detailed-plan.md)                       |
| 02.5 Document Spine              | [plans/2026-06-28-phase-02-5-document-spine-plan.md](plans/2026-06-28-phase-02-5-document-spine-plan.md)                                             |
| 03 India GST Core                | [plans/2026-06-16-phase-03-india-gst-core-detailed-plan.md](plans/2026-06-16-phase-03-india-gst-core-detailed-plan.md)                               |
| 04 Bank And Reconciliation       | [plans/2026-06-16-phase-04-bank-reconciliation-detailed-plan.md](plans/2026-06-16-phase-04-bank-reconciliation-detailed-plan.md)                     |
| 05 AI Assistant                  | [plans/2026-06-16-phase-05-ai-assistant-detailed-plan.md](plans/2026-06-16-phase-05-ai-assistant-detailed-plan.md)                                   |
| 06 Platform API Integrations     | [plans/2026-06-16-phase-06-platform-api-integrations-detailed-plan.md](plans/2026-06-16-phase-06-platform-api-integrations-detailed-plan.md)         |
| 07 Service SMB Expansion         | [plans/2026-06-16-phase-07-service-smb-expansion-detailed-plan.md](plans/2026-06-16-phase-07-service-smb-expansion-detailed-plan.md)                 |
| 08 Accountant Mode               | [plans/2026-06-16-phase-08-accountant-mode-detailed-plan.md](plans/2026-06-16-phase-08-accountant-mode-detailed-plan.md)                             |
| 09 Trade Inventory Import Export | [plans/2026-06-16-phase-09-trade-inventory-import-export-detailed-plan.md](plans/2026-06-16-phase-09-trade-inventory-import-export-detailed-plan.md) |
| 10 Country Tax Engine            | [plans/2026-06-16-phase-10-country-tax-engine-detailed-plan.md](plans/2026-06-16-phase-10-country-tax-engine-detailed-plan.md)                       |

Compact overview: [plans/2026-06-16-phases-02-10-roadmap-plans.md](plans/2026-06-16-phases-02-10-roadmap-plans.md).

## Foundation Rules

- Phase 0 and Phase 1 are hard gates.
- `organization` means business tenant in Better Auth.
- UI says "Business", not "organization".
- tenant-scope inventory means security checklist, not stock inventory.
- Accounting money uses integer minor units.
- Posted journal entries are immutable.
- Corrections use reversals and new postings.
- Sensitive mutations write `audit_event`.
- Async intent uses `outbox_event` when there is a durable async consumer or retry requirement.
- `requestId` is not a replay key. Use natural unique keys or provider
  idempotency only where the domain requires it.
- Sales, purchase, and settlement document drafts use a non-official `draft_reference`; official document
  numbers are allocated only when posting succeeds.
