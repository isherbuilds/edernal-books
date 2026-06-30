# AI-Native Accounting Foundation Design

Date: 2026-06-16

Updated: 2026-06-29 to align source traceability with
`docs/decisions/0012-replace-source-document-with-journal-source-metadata.md`.

Glossary: `docs/superpowers/plans/2026-06-16-plan-set-index.md` defines overloaded terms such as tenant scope, snapshot, `outbox_event`, and operation-local idempotency.

## Scope

Build an owner-first accounting application for India SMBs, beginning with a small but durable Phase 0-1 foundation before adding invoices, expenses, GST workflows, bank reconciliation, AI, public APIs, MCP, webhooks, inventory, or country-pack breadth.

The first customer is an owner-operated small business. Accountants come later as reviewers and multi-business operators. Trade, inventory, import, export, and multi-country workflows come after the accounting foundation is trusted.

Core promise: owners can run routine accounting workflows without needing debit/credit knowledge, while the system still produces accountant-grade books.

## Product Direction

The application should combine Tally's accounting discipline with Zoho's owner-friendly workflow model.

Owner-facing workflows should speak in business terms:

- Create invoice.
- Record expense.
- Record money received.
- Record money paid.
- Review tax position.
- Export clean books.

The system core must always maintain double-entry accounting:

- Every posted document creates balanced journal entries and lines.
- Posted entries are immutable.
- Corrections happen through reversals and new postings.
- Manual journal entry posting exists only as an advanced/accountant workflow.

AI, external APIs, MCP, webhooks, and marketplace integrations are not Phase 0-1 features. The foundation should still be integration-ready through stable service boundaries, audit events, operation-local idempotency, permissions, and journal source traceability. Outbox producers start when a durable async consumer exists.

## Stack Decision

Use the existing `tsu-stack` architecture:

- TanStack Start for the SSR web app.
- Hono/oRPC for server and typed procedure boundaries.
- PostgreSQL as the primary database.
- Drizzle for schema and queries.
- Better Auth for authentication, organizations, roles, and invitations.
- Zod for validation at boundaries.
- React Hook Form for dense owner-facing forms.
- S3-compatible object storage when document assets arrive.
- Vite Plus for workspace commands, checks, formatting, and tests.
- Docker/Coolify deployment.

Use existing package boundaries:

- `packages/core`: shared schemas, contracts, pure helpers.
- `packages/db`: Drizzle schema, migrations, database client, and query helpers.
- `packages/auth`: Better Auth configuration and auth helpers.
- `packages/api`: Hono/oRPC context and routers.
- `apps/web`: TanStack Start UI.

Do not introduce `packages/domain` or `packages/shared` as part of this plan set.

## Architecture Overview

The product architecture keeps owner workflows simple while preserving a
deterministic accounting core.

```mermaid
flowchart TD
  Owner["Owner UI<br/>plain business language"] --> Web["apps/web"]
  Accountant["Accountant UI<br/>advanced review"] --> Web
  Web --> API["@tsu-stack/api<br/>oRPC procedures"]
  API --> Core["@tsu-stack/core<br/>shared contracts"]
  API --> Auth["@tsu-stack/auth<br/>session, organization, role"]
  API --> DB["@tsu-stack/db<br/>Drizzle + Postgres"]
  API --> AccountingCore["packages/core/src/accounting<br/>pure posting rules"]
  DB --> Audit["audit_event"]
  DB --> Outbox["outbox_event<br/>future async consumers"]
  DB --> OperationKey["operation-local idempotency"]
  DB --> Ledger["ledger_account<br/>journal_entry<br/>journal_line"]
  Ledger --> Reports["trial balance<br/>general ledger"]
```

Posting flow:

```mermaid
sequenceDiagram
  participant UI as Owner workflow
  participant API as API service
  participant Core as core accounting
  participant DB as tenant transaction
  participant Ledger as journal tables
  participant Audit as audit

  UI->>API: Post document or journal command
  API->>DB: Start org-scoped transaction
  API->>DB: Check operation key or natural unique key
  API->>Core: Validate money, accounts, balance
  Core-->>API: Valid posting model
  API->>Ledger: Insert journal_entry and journal_line rows
  API->>Audit: Write audit_event
  DB-->>API: Commit
  API-->>UI: Posted result
```

Phase dependencies:

```mermaid
flowchart LR
  P0["Phase 0<br/>Platform"] --> P1["Phase 1<br/>Ledger kernel"]
  P1 --> P2["Phase 2<br/>Sales, purchase, and settlement documents"]
  P2 --> P3["Phase 3<br/>India GST"]
  P2 --> P4["Phase 4<br/>Bank reconciliation"]
  P3 --> P4
  P4 --> P5["Phase 5<br/>AI suggestions"]
  P5 --> P6["Phase 6<br/>API + integrations"]
  P2 --> P7["Phase 7<br/>Service SMB"]
  P1 --> P8["Phase 8<br/>Accountant mode"]
  P2 --> P9["Phase 9<br/>Trade + inventory"]
  P3 --> P10["Phase 10<br/>Country tax engine"]
```

## Tenancy Model

Use Better Auth `organization` as the business tenant.

Product mental model:

- `organization` = business.
- `member` = user in the business.
- `organization_setting` = legal/accounting settings for the business.

Do not store accounting/legal/tax fields directly on Better Auth-owned tables. App-owned business data belongs in app-owned tables.

There is no separate `business_entity` table in Phase 0-1.

Every app-owned tenant table includes `organization_id` unless it is global reference data. Better Auth-owned tables are managed by Better Auth and excluded from app tenant-scope checks. PostgreSQL row-level security is deferred for MVP; tenant isolation is enforced by server-side membership checks and explicit `organizationId` query predicates.

Accountants are users who are members of multiple organizations. API keys are machine credentials for integrations, not human accountant access.

## Roles

Initial organization roles:

- `owner`: full control over business settings, members, books, accounting setup, manual postings, reversals, period locks, reports, and later integrations.
- `accountant`: accounting-kernel actions and reports, including manual postings, reversals, period locks, review, exports, and adjustments; no member management or business identity settings.
- `viewer`: no accounting-kernel reports or actions by default. Grant narrow owner-facing views later when a workflow needs them.

Role checks are enforced server-side. API keys must not bypass organization permissions.

## Identifier and Money Rules

Better Auth IDs keep the type generated by this repo. App-owned columns that reference Better Auth tables must match the referenced column type.

App-owned accounting table primary keys may use UUID-v7, but do not force a Better Auth UUID-v7 migration unless that is a separate explicit auth migration.

Money rules:

- ordinary money uses `*_minor bigint`;
- exchange rates use `numeric(20, 10)`;
- tax rates use `numeric(9, 4)`;
- quantities use `numeric(18, 4)`;
- JavaScript floating-point arithmetic is not used for accounting money.
- Phase 1 journal lines store base debit/credit minor units only. Base currency is an organization accounting setting, not a per-line command field or per-line stored column.

## Phase Plan

### Phase 0: Platform Foundation

Acceptance criteria:

- User signup/login.
- Organization/business creation.
- `organization_setting` creation and update.
- Member invitation.
- Server-side role checks.
- `audit_event` table and writer.
- `outbox_event` table for future durable async producers.
- `currency` reference data.
- Tenant-scoped query helpers or service checks for app-owned tenant tables.
- Database migrations.
- Docker/Coolify deployment path documented.
- Error logging and basic health checks.

Out of scope:

- app-owned API-key tables;
- public API routes;
- webhook delivery;
- AI tables;
- bank tables;
- invoice/expense/payment tables;
- GST tables.

### Phase 1: Accounting Kernel

Acceptance criteria:

- Fiscal year setup.
- Monthly accounting periods.
- `ledger_account` chart of accounts.
- `number_sequence`.
- historical minimal `source_document`; ADR-0012 replaces it with journal
  source metadata.
- `journal_entry`.
- `journal_line`.
- double-entry validation.
- immutable posted entries.
- reversal entries.
- trial balance.
- general ledger.
- advanced entry register.
- base-currency-only journal lines without per-line currency code.
- transactional audit rows for accounting mutations.
- `packages/core/src/accounting` tests for money, posting, reversal, and report invariants.

Out of scope:

- `party`;
- `tax_code`;
- invoice/bill/payment documents;
- subledger/settlement;
- balance cache tables;
- persisted journal drafts;
- FX journal posting;
- posting outbox producers.

### Phase 2: Owner Workflow MVP

Add customer/vendor parties, items, invoices, expenses/bills, receipts, payments, allocations, PDFs/share links, and a basic owner dashboard. Users should not need to understand debit and credit in normal workflows. Posted documents are immutable for accounting-impacting fields; corrections use credit/debit notes, reversals, voids, or replacement documents. Final invoice numbers are assigned only when issued/posted, and issued invoices are retained even when voided so later invoice numbers do not shift.

### Phase 3: India GST Core

Add GST settings, GSTIN/PAN/state fields, HSN/SAC, place-of-supply, CGST/SGST/IGST logic, tax codes/components, tax invoice details, credit/debit notes, GSTR-1/GSTR-3B working reports, and exports.

### Phase 4: Bank and Reconciliation

Add bank statement import, duplicate detection, matching suggestions, owner approval, and reconciliation reports.

### Phase 5: AI Assistant

Add assistant over ledger, documents, bank transactions, and reports. AI can explain, extract, suggest, and draft. AI must not post final accounting or tax changes without deterministic service validation and explicit user approval.

### Phase 6: Platform API and Integrations

Add public API, API-key scope UI, webhook delivery, OpenAPI docs, MCP server, integration logs, retries, dead-letter handling, and external references.

### Phase 7: Service SMB Expansion

Add recurring invoices, retainers, projects, lightweight time tracking, quotes/proposals, payment links, and client statements.

### Phase 8: Accountant Mode

Add multi-business accountant workspace, review queue, locked periods, adjustment entries, working papers, and Tally/Excel exports.

### Phase 9: Trade, Inventory, Import, Export

Add stock ledger, warehouses, purchase orders, sales orders, landed cost, import/export documents, foreign currency, IEC/export invoice flows, and LUT/bond support.

### Phase 10: Country-Agnostic Tax Engine

Add tax plugin contract, VAT/GST localization packs, country invoice schemas, report templates, multi-currency fixtures, and localization tests.

## Core Tables by Phase

### Better Auth-Owned Tables

Better Auth manages:

- `user`.
- `session`.
- `account`.
- `verification`.
- `organization`.
- `member`.
- `invitation`.
- `api_key` if the Better Auth API-key plugin is installed and version-compatible.

The app may configure plugins, but these tables are not accounting-domain tables and are not included in app-owned tenant-scope inventory. Here, inventory means the security checklist of tenant tables and query paths, not stock or warehouse inventory.

### Phase 0 App-Owned Tables

`organization_setting`:

- one row per organization;
- legal/trade name;
- country, base currency, timezone;
- fiscal year start month;
- books start date;
- email/phone;
- timestamps.

`currency`:

- global reference table;
- no `organization_id`;
- code, name, symbol, decimal places, active flag.

`audit_event`:

- structured `{ before, after, metadata }` payload;
- writes who changed what and when.

`outbox_event`:

- transactional outbox for internal jobs, reports, AI indexing, public API integrations, and future webhooks;
- not every accounting mutation writes outbox before a durable async consumer exists;
- webhook delivery tables come in Phase 6.

Idempotency:

- `requestId` is tracing only;
- natural upserts use natural keys;
- accounting commands use operation-local command keys or natural unique keys;
- public API response replay can add a central replay store in Phase 6 if needed.

### Phase 1 App-Owned Tables

`fiscal_year`:

- organization, name, start/end, status, close metadata.

`accounting_period`:

- organization, fiscal year, month/period name, start/end, lock status.

`ledger_account`:

- one hierarchical account table;
- group/posting distinction;
- system key;
- manual-posting flag.

`number_sequence`:

- organization-scoped sequence allocation for entry/document numbers.

`source_document` (superseded by ADR-0012):

- removed table; `journal_entry.source_type`, `source_record_id`, and
  `source_number` now carry trace/cache metadata.

`journal_entry`:

- one posted accounting fact;
- period/source/idempotency/reversal links;
- immutable once posted.

`journal_line`:

- entry lines with account and base-currency minor-unit debit/credit values;
- no `party_id` or `tax_code_id` in Phase 1.

## Integration-Ready Foundation

Build now:

- stable internal IDs;
- service layer between UI and database;
- `audit_event`;
- `outbox_event` table, with producers added only when durable async consumers exist;
- operation-local idempotency for money-moving commands;
- permission model;
- Zod contracts;
- journal source metadata from postings;
- clean error codes;
- Tenant-scoped query helpers.

Do not build now:

- public API documentation;
- webhook delivery;
- outbox producers without a durable consumer;
- MCP server;
- AI chat;
- OAuth marketplace;
- app-owned API-key table;
- external developer portal.

## Accounting Invariants

Non-negotiable rules:

- Posted entry cannot be edited.
- Correction requires reversal plus new posting.
- Batch must balance before posting.
- Entry lines belong to the same organization as the entry.
- Accounts belong to the same organization as the entry line.
- Accounting period controls posting dates and locks.
- Every system-generated posting carries journal source metadata once typed
  documents exist.
- Money uses minor units, never JavaScript float.
- Every sensitive mutation writes `audit_event`.
- Posting operations support idempotency.
- Trial balance must balance.

## Owner UX Principles

The owner should not be forced to understand accounting vocabulary.

UI language:

- Use "Business", not "organization".
- Use "Customer" and "Vendor", not "party".
- Use "Money received" and "Money paid", not debit/credit.
- Keep "Journal", "Batch", and "Ledger" in advanced/accountant mode.

Experience principles:

- smart defaults;
- plain-language errors;
- mobile-first capture;
- autosaved drafts where safe;
- slow-network tolerant screens;
- small route bundles;
- server-rendered report pages;
- no final accounting posting without deterministic validation.

## Deferred Decisions

Do not solve in Phase 0-1:

- multi-branch under one organization;
- multi-GSTIN reporting across branches;
- consolidated accountant dashboards;
- public webhook delivery;
- MCP server;
- AI assistant;
- exchange-rate import/revaluation;
- inventory;
- import/export documents;
- country tax plugins.

These are deferred to protect accounting foundation quality.
