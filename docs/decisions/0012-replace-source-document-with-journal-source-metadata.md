# ADR-0012: Replace source_document with journal source metadata

## Status

Accepted

Supersedes the `source_document` backbone described in
[ADR-0001](0001-accounting-foundation-spine.md),
[ADR-0008](0008-document-lifecycle.md), and
[ADR-0010](0010-allocate-document-numbers-on-post.md).

## Date

2026-06-29

## Context

The accounting foundation introduced `source_document` as a minimal traceability
shell between business documents and posted journal entries. Phase 2.5 then
added typed document tables for sales, purchase, and settlement workflows, each
with a direct `journal_entry_id` link after posting or voiding.

That leaves `source_document` as a second document identity path. It duplicates
typed document rows, adds joins on posting paths, and invites business code to
query documents through a generic source table instead of the owning typed
tables.

`number_sequence` is already the central allocator for journal and official
document numbers, so this change does not replace numbering infrastructure.

## Decision

Remove the `source_document` table. Store source trace metadata directly on
`journal_entry`:

- `source_type text` nullable.
- `source_record_id uuid` nullable.
- `source_number text` nullable.

These columns are a ledger trace/cache only. Business code must not use
`source_type` as a query path for loading invoices, purchase documents,
settlements, or future document workflows. Each workflow reads its owning typed
table and follows `journal_entry_id` when it needs the posted or voided ledger
authority.

Documents link to the ledger through `journal_entry_id`. For posted and voided
documents, `journal_entry_id` is the accounting authority. Draft documents have
no ledger impact and no journal source metadata.

Keep `number_sequence` unchanged as the central allocator for journal entry
numbers and official document numbers.

## Invariants

- Manual journal entries have `source_type`, `source_record_id`, and
  `source_number` all null.
- Document postings set all three source columns non-null.
- Source type values are limited to the known posting families:
  `sales_invoice`, `purchase_bill`, `expense`, `settlement_received`, and
  `settlement_paid`.
- Reversals copy the original source columns and set `reversal_of_entry_id`.
- Only one original journal entry may exist per source through a partial unique
  constraint on `(organization_id, source_type, source_record_id)` where
  `source_record_id is not null and reversal_of_entry_id is null`.
- Reversals are excluded from that source uniqueness check and remain governed
  by the existing one-reversal-per-original constraint.
- Business code never queries documents through `source_type`; it queries typed
  document tables and treats journal source columns as trace metadata.

## Alternatives Considered

### Keep source_document as the document-to-ledger backbone

- Pros: Existing Phase 1/2.5 plan language already described this shape.
- Cons: Duplicates typed document identity, adds an extra posting join, and
  creates a tempting generic query path for business code.
- Rejected: Typed documents already own business state and `journal_entry_id`
  is enough to link posted/voided documents to accounting authority.

### Add per-domain source tables

- Pros: Could make source metadata explicit per workflow.
- Cons: Adds tables without new behavior and still duplicates typed document
  rows.
- Rejected: Source metadata belongs on the journal entry as trace/cache data.

### Add a generic document table

- Pros: One table could hold common lifecycle fields.
- Cons: Conflicts with ADR-0009's typed-table decision and weakens
  domain-specific constraints.
- Rejected: Sales, purchase, and settlement documents keep explicit typed
  tables.

## Consequences

- Posting services write journal source metadata instead of inserting
  `source_document`.
- Sales, purchase, and settlement tables keep `journal_entry_id` as the
  posted/voided ledger link.
- Manual journal public DTOs do not expose journal source metadata.
- Query surfaces do not gain source-type filters. Lists and detail pages use
  typed document tables or journal/report queries directly.
- Old planning docs that mention `source_document` are historical unless they
  explicitly point to this ADR.
