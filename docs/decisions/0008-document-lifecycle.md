# ADR-0008: Document Lifecycle

## Status

Accepted

Superseded in part by [ADR-0012](0012-replace-source-document-with-journal-source-metadata.md):
posted documents now link to ledger authority through `journal_entry_id`, while
`journal_entry` carries source metadata as trace/cache columns.

## Date

2026-06-28

## Context

Sales, purchase, and settlement documents need a lifecycle that is simple enough for invoices, purchase bills, and settlements, but strong enough to preserve accounting history. Editing posted documents, deleting posted documents, partial voids, approvals, and credit/debit notes all add separate accounting and product semantics.

## Decision

Use `DRAFT -> POSTED -> VOIDED` for Phase 2.5 documents. Drafts are editable and have no ledger impact. Posted documents are immutable for accounting-impacting fields and link to the created `journal_entry`; ADR-0012 supersedes the earlier `source_document` link with journal source metadata. Voiding a posted document is terminal and creates a reversal posting; the original posted document and original accounting fact remain intact.

## Consequences

Phase 2.5 can ship a stable document spine without mixing in approvals, edit-after-post flows, credit/debit notes, or partial correction workflows. Phase 3 and later phases can add credit/debit notes, approvals, delivery, and richer correction flows as explicit documents rather than weakening posted-document immutability.
