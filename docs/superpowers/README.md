# Accounting Planning Hub

This directory contains the execution planning set for the Edernal Books
accounting product. These files are intentionally detailed because agents use
them as implementation instructions.

## Read Order

1. [Foundation design spec](specs/2026-06-16-ai-native-accounting-foundation-design.md)
2. [Plan set index](plans/2026-06-16-plan-set-index.md)
3. [Schema revision source of truth](plans/2026-06-17-accounting-foundation-schema-revision-plan.md)
4. Phase plan for the current task.
5. [ADR-0001](../decisions/0001-accounting-foundation-spine.md)

## Current Status

Updated: 2026-06-19.

Phase 0 is in progress. The current foundation slice has landed:

- Better Auth organization plugin and generated organization/member/invitation schema.
- DB client split into `client.ts`, `migrate.ts`, reusable queries, schema files, and health helpers.
- App-owned foundation tables: `organization_setting`, `currency`, `audit_event`, `outbox_event`, and `idempotency_ledger`.
- UUID-v7 runtime defaults for app-owned UUID primary keys.
- oRPC auth context, `organizationProcedure`, membership verification by `orgSlug`, and organization settings get/upsert procedures.
- Organization settings writes return a small success envelope and emit best-effort user activity in `audit_event`.

Current deliberate gap: `outbox_event` exists, but organization settings upsert does not emit an outbox row yet because no worker/webhook/async consumer exists. Use awaited transactional outbox writes for accounting-critical commands once Phase 1 posting services start.

Next steps:

- Apply the generated migration to local development DB.
- Seed at least `INR`, `USD`, `EUR`, and `GBP` in `currency`.
- Add role permission helpers/tests for Better Auth organization roles.
- Build onboarding/business settings UI around the existing organization settings procedures.
- Add idempotency claim/replay helper before create/post commands in Phase 1.
- Start Phase 1 only after the Phase 0 gate below is true.

## Phase Plans

| Phase                            | Plan                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00 Platform Foundation           | [plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md](plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md)         |
| 01 Accounting Kernel             | [plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md](plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md)             |
| 02 Owner Workflow MVP            | [plans/2026-06-16-phase-02-owner-workflow-mvp-detailed-plan.md](plans/2026-06-16-phase-02-owner-workflow-mvp-detailed-plan.md)                       |
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
- Posted journal batches are immutable.
- Corrections use reversals and new postings.
- Sensitive mutations write `audit_event`.
- Async intent uses `outbox_event` when there is a durable async consumer or retry requirement.
- Replay protection uses `idempotency_ledger`.
