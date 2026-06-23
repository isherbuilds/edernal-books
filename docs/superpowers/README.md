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

Phase 0 code is complete. The current foundation slice has landed:

- Better Auth organization plugin and generated organization/member/invitation schema.
- DB client split into `client.ts`, `migrate.ts`, reusable queries, schema files, and health helpers.
- App-owned foundation tables: `organization_setting`, `currency`, `audit_event`, and `outbox_event`.
- UUID-v7 runtime defaults for app-owned UUID primary keys.
- oRPC auth context, `organizationProcedure`, membership verification by `orgSlug`, and organization settings get/upsert procedures.
- Organization settings writes return a small success envelope and write audit rows in the same DB transaction.
- Fresh baseline migration covers schema plus seed currencies `INR`, `USD`, `EUR`, and `GBP`.
- Web organization setup at `/organizations/new` creates/selects a business by slug.
- Web business settings at `/$orgSlug/settings/business` reads and writes `organization_setting`.
- Auth package exports Phase 0 role permission helpers with unit tests.
- Unit tests cover role permissions, organization membership resolution, settings audit rows, and schema tenant-scope invariants.

Current deliberate gap: `outbox_event` exists, but organization settings upsert does not emit an outbox row yet because no worker/webhook/async consumer exists. Use awaited transactional outbox writes for accounting-critical commands once Phase 1 posting services start.

Current idempotency decision: request ids are for tracing only. Phase 0 does
not keep a generic `idempotency_ledger`; natural upserts use natural keys, and
future posting commands should use operation-local command keys or domain-owned
unique constraints. Reconsider a central replay store only when Phase 6 public
API semantics need heterogeneous response replay.

Current environment blocker:

- Apply the generated migration to local development DB after Docker/Postgres is running. On 2026-06-19, `rtk vp run db:migrate` failed with `ECONNREFUSED` because nothing was listening on localhost port 5432 and the Docker daemon was not running.

Next step:

- Keep Phase 1 paused until the local database migration has been applied and one business settings row has been created through the UI.

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
- Replay protection uses operation-local idempotency keys or natural unique keys; `requestId` is not a replay key.
