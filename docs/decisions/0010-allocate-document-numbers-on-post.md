# ADR-0010: Allocate Document Numbers On Post

## Status

Accepted

Superseded in part by [ADR-0012](0012-replace-source-document-with-journal-source-metadata.md):
the post transaction writes `journal_entry` source metadata instead of creating
`source_document`. `number_sequence` remains unchanged.

## Date

2026-06-28

## Context

Phase 2.5 documents need human-readable numbers for sales invoices,
purchase bills or expenses, and settlements. Drafts also need something useful
for UI navigation, future assistant references, and preview screens.

Frappe Books assigns a `NumberSeries` value when a submittable draft is first
saved. Deleted unsubmitted drafts can leave sequence gaps. Midday creates
invoices as drafts and keeps invoice numbers system-generated, but it uses
SaaS invoice statuses rather than accounting posting semantics, and its invoice
number helper derives the next number from existing rows instead of treating the
number as a compliance-grade sequence.

This repo needs the document spine to support India GST and later compliance
work without replacing the lifecycle.

## Decision

Allocate official document numbers only when a draft is posted. Drafts get
a non-official `draft_reference` for UI, assistant, and support references. The
post operation allocates the official `document_number` through
`number_sequence` in the same database transaction that creates the
`journal_entry` with source metadata, lines, and `audit_event`.

The initial sequence families are `sales_invoice` (`INV-YY-YY-`),
`purchase_bill` (`BILL-YY-YY-`), `expense` (`EXP-YY-YY-`),
`settlement_received` (`RCT-YY-YY-`), and `settlement_paid` (`PAY-YY-YY-`).

Assistant-facing and owner-facing tools may create or update drafts, but they
must not set official document numbers. Posted and voided documents retain their
official document number forever. Existing document post and void commands lock
the document row and branch on status. Create-and-post is a direct command:
clients must disable repeat submits, and the server does not provide response
replay for retried create-and-post requests in this phase.

Sales, purchase, and settlement document ids are also server-owned for draft and create-and-post
commands. Create-and-post generates the document id inside the transaction,
inserts the draft row, and posts that same id. Clients send `documentId` only
when operating on an existing document, such as update, post, void, or get.

## Alternatives Considered

### Number drafts at create time

- Pros: Matches Frappe's saved-draft UX and makes draft preview look final.
- Cons: Deleted drafts create sequence questions before any accounting fact
  exists. GST and audit behavior become harder to reason about later.
- Rejected: Better UX can come from `draft_reference` without spending the
  official sequence.

### Recompute next number from existing rows

- Pros: Similar to Midday's simple SaaS invoice helper.
- Cons: Deleted or concurrent rows can reuse or race numbers unless surrounded
  by stronger locking. It is not the right accounting primitive when Phase 1
  already owns `number_sequence`.
- Rejected: `number_sequence` exists specifically to allocate durable numbers
  inside posting transactions.

### Let users or assistants choose document numbers

- Pros: Supports manual migration and custom numbering.
- Cons: Raises collision, audit, and compliance risk.
- Rejected: Phase 2.5 keeps system-generated official numbers. Migration or
  admin override workflows can be designed separately when needed.

## Consequences

Draft UI must display `draft_reference` or "Draft" instead of pretending a final
invoice number exists. Preview/PDF work later must handle drafts without an
official number and posted documents with a retained official number.

Posting tests must prove rollback after sequence allocation does not publish a
document number, duplicate post or void attempts against existing documents fail
by status, and voided documents retain their number. Phase 3 can attach GST
invoice serial behavior to posted documents without changing Phase 2.5 draft
semantics.
