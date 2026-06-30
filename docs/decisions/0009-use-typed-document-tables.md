# ADR-0009: Use Typed Document Tables

## Status

Accepted

Updated by [ADR-0012](0012-replace-source-document-with-journal-source-metadata.md):
typed documents use `journal_entry_id` for posted/voided ledger authority;
`source_document` is no longer a lifecycle field.

## Date

2026-06-28

## Context

The document spine could use one generic document table with a type column and JSON payloads, or separate tables for sales documents, purchase documents, and settlements. A generic table would reduce duplicated columns at first, but sales documents, purchase documents, and settlements have different accounting invariants, allocation behavior, GST extension points, and future public API shapes.

## Decision

Use typed document tables: `sales_document` with `sales_document_line`, `purchase_document` with `purchase_document_line`, and `settlement_document` with `settlement_allocation`. Repeat common lifecycle fields such as status, `draft_reference`, official document number, journal entry, posted metadata, void metadata, and lifecycle-specific operation keys in each typed table. Share lifecycle behavior through service functions and tests, not through a generic persistence table.

## Consequences

The schema accepts some duplication, but accounting constraints stay explicit and future GST, bank reconciliation, AI tools, public APIs, and PDF rendering can attach to stable domain-specific rows. JSON render snapshots may be added later for presentation, but they must not become the accounting source of truth.
