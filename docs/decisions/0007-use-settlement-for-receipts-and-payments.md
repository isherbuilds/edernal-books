# ADR-0007: Use Settlement for Receipts and Payments

## Status

Accepted

## Date

2026-06-28

## Context

The Phase 2 planning set used two shapes for money movement: the detailed plan described one payment record with a received/paid direction, while the compact roadmap split receipts and payments into separate modules. Separate modules would duplicate lifecycle, allocation, posting, and reversal rules before bank reconciliation, payment links, or gateway integrations exist.

## Decision

Use one settlement concept for owner money movement. A settlement can represent money received from a customer or money paid to a vendor, can allocate to one or more sales or purchase documents, and posts through the accounting kernel. Owner UI should use friendly labels such as money received and money paid, while the domain model keeps one settlement lifecycle.

## Consequences

Phase 2.5 avoids parallel receipt/payment implementations and gives later bank reconciliation, payment links, advances, retainers, and gateway integrations one accounting target to attach to. Future plans should treat receipt/payment as product labels unless a later ADR intentionally splits the domain model.
