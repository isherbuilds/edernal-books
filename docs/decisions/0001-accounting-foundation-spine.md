# ADR-0001: Accounting Foundation Spine

## Status

Accepted

## Date

2026-06-17

## Context

The plan set had two competing directions:

- a repo-aligned staged plan set using `@tsu-stack/*`, `packages/core`, `packages/db`, `packages/api`, `packages/auth`, `apps/web`, and Vite Plus commands;
- an unstaged v2 spine draft with stronger accounting ideas, but generic `@app/*`, `packages/domain`, `packages/shared`, `audit_log`, `internal_event`, and document-specific sequence language.

The product goal is owner-friendly India SMB accounting with accountant-grade books. The foundation needs to be durable enough for invoices, GST, bank reconciliation, AI, public APIs, webhooks, inventory, and country localization without shipping future-phase tables before there is behavior to write and read them.

## Decision

Use the staged repo-aligned plan set as the execution baseline.

Adopt the durable accounting spine:

- Better Auth `organization` is the business tenant.
- App-owned tenant tables use `organization_id` matching the generated Better Auth organization ID type.
- In this repo today, generated Better Auth IDs are text, so app-owned tenant
  foreign keys store `organization_id` as text and do not cast to UUID.
- Phase 0 owns `organization_setting`, `currency`, `audit_event`, and
  `outbox_event`.
- Phase 1 owns `fiscal_year`, `accounting_period`, `ledger_account`, `number_sequence`, minimal `source_document`, `journal_entry`, and `journal_line`.
- `organization_setting` stays narrow. PAN, GSTIN, registered addresses, branch locations, invoice profile details, and tax registration data are added with the later workflows that consume them.
- `requestId` is tracing only. Duplicate protection for money-moving commands
  uses operation-local command keys, provider ids, natural keys, or
  domain-owned unique constraints.
- `source_document` is a traceability shell, not a generic idempotency authority.
- Phase 1 journal lines store base debit/credit minor units only. Currency remains an organization accounting setting and is not copied into every line or accepted from manual journal commands.
- Accounting foundation settings that define currency and fiscal boundaries become locked once fiscal-year setup exists; enforce this in the settings write path during Phase 1.
- Later phases must use `number_sequence`, `journal_entry`, `audit_event`,
  `outbox_event`, and operation-local idempotency; they must not reintroduce
  `document_sequence`, simple `journal`, `audit_log`, or `internal_event`.

## Alternatives Considered

### Execute the v2 spine draft directly

Rejected. It had strong schema instincts, but it was not fitted to this repository. It introduced package names and command forms that conflict with the existing `tsu-stack` plan.

### Keep both plan sets

Rejected. Competing source-of-truth documents would cause implementation drift. Agents would choose different names and package boundaries.

### Ship parties and tax codes in Phase 1

Rejected for now. Parties and taxes are important, but Phase 1 should prove the ledger kernel. Adding nullable party and tax placeholders before owner documents and GST workflows exist weakens schema clarity.

## Consequences

- Implementation agents should read the plan-set index and schema revision before any phase plan.
- The old v2 spine draft should not remain as an execution plan.
- Any later decision to introduce `packages/domain`, `packages/shared`, or `@app/*` imports needs a new ADR.
- Tenant isolation is app-enforced for MVP. See
  [ADR-0002](0002-defer-postgresql-rls-for-mvp.md) for the database URL and
  PostgreSQL RLS decision.
