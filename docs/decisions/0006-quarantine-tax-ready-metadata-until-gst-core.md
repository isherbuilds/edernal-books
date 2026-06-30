# ADR-0006: Quarantine Tax-Ready Metadata Until GST Core

## Status

Accepted

## Date

2026-06-28

## Context

Phase 2 foundation already introduced optional party and item fields such as GST registration type, GSTIN, PAN, and HSN code, while the phase plans still assign GST validation, tax calculation, tax reporting, and compliance behavior to Phase 3. Rolling the fields back would create migration and contract churn, but treating them as Phase 2 behavior would blur the boundary between document workflow and GST core.

## Decision

Keep the existing optional fields as tax-ready metadata only. Phase 2.5 may preserve these values, but it must not require them for posting, validate GST law, compute tax lines, post tax journals, create GST reports, or present them as complete GST setup. Phase 3 owns tax semantics, including GST settings, tax codes, GSTIN/PAN/HSN/SAC validation rules, tax calculation, tax journal lines, report snapshots, and compliance exports.

## Consequences

Sales, purchase, and settlement document posting can move forward without rollback work, and Phase 3 can attach GST behavior to stable documents later. Until Phase 3 lands, docs and UI must avoid implying that captured tax-ready metadata produces GST-compliant invoices or reports.
