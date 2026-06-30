# Phase 02.5 — Document Surfaces & Structured Editor Design

Date: 2026-06-28
Status: Implemented, validated locally
Builds on: `2026-06-28-phase-02-5-document-spine-plan.md` (the posted-document spine this
restyles). Code and table names from that spine are unchanged.

## Purpose

The document spine shipped with a single generic `/documents` page: one register mixing
invoices, bills, expenses, and settlements, and one single-line create sheet. That surface does
not match how owners think (invoice / bill / payment) or how the reference apps present these
documents. This slice replaces it with grouped, owner-recognizable surfaces and a real
multi-line document editor, and folds in the correctness fixes the spine review surfaced.

"Sales, purchase, and settlement document" stays an internal architectural term for the shared lifecycle spine. It must
not appear in the UI.

## Reference decision (Midday / Frappe / Invoicely)

The editor is a deliberate hybrid (see `2026-06-27-phase-02-reference-architecture-research.md`
for the spine-level comparison; this records the editor-level decision):

- **Lifecycle & owner-first model — Midday.** Draft → post → void, post-time numbering,
  posted = immutable. The only reference built around an accounting lifecycle rather than a
  stateless PDF maker. Renderable output lives behind a package boundary (deferred here).
- **Editor mechanics — Invoicely (`legions-developer/invoicely`).** react-hook-form + Zod
  surface schemas, `useFieldArray` line items, and shadcn-style form-field wrappers. Line order
  follows entry order: add/remove only, no drag controls, no `useFieldArray.move` buttons, and
  no Motion dependency for this slice.
- **Regional structure — Frappe Books.** Sales/Purchase grouping (adopted below) and GST as a
  first-class overrideable layer (deferred to Phase 03). Structure only; its Vue fat-models and
  print templates do not port.
- **Rejected from all three:** float money (we keep integer minor units), derived-only totals
  (we persist immutable posted amounts), Midday's WYSIWYG "form is the invoice" canvas (an India
  GST document is generated from structured input, not typed into a rendered layout — we take a
  structured editor + generated template), and Invoicely's split-pane per-keystroke PDF
  regeneration and dual IndexedDB/DB persistence.

Interaction model chosen for this slice: **structured document editor + read-only detail view**.
The structured editor is the **permanent** entry model, not a stand-in for a future WYSIWYG — an
India GST document is generated from structured input, not typed into a rendered layout. No
rendered preview or PDF this slice; that output is a later phase and lands as a **read-only
generated template** (preview + PDF) fed by this editor's data, per `.agents/design-system.md`.
This slice only makes the data contract and editor shape ready for that work.

## Surfaces & routing

Frappe-style two-group navigation. Settlements split by direction: receipts are sales-side
money-in, payments are purchase-side money-out.

```
Sales      (group, index → redirect to sales/invoices)
  Invoices   sales/invoices            sales_document
  Receipts   sales/receipts            settlement_document, direction = received
Purchase   (group, index → redirect to purchase/bills)
  Bills      purchase/bills            purchase_document  (bill + expense kinds)
  Payments   purchase/payments         settlement_document, direction = paid
```

Routes live under `apps/web/src/routes/{-$locale}/_app/$orgSlug/_shell/`:

- `sales.tsx`, `purchase.tsx` — section index routes that redirect to their primary child.
- `sales/invoices.tsx`, `sales/invoices/new.tsx`, `sales/invoices/$documentId.tsx`
- `sales/receipts.tsx`, `sales/receipts/new.tsx`, `sales/receipts/$documentId.tsx`
- `purchase/bills.tsx`, `purchase/bills/new.tsx`, `purchase/bills/$documentId.tsx`
- `purchase/payments.tsx`, `purchase/payments/new.tsx`, `purchase/payments/$documentId.tsx`

A `$documentId` route shows the editor when the document is a draft and a read-only detail view
when it is posted or voided (posted = immutable; correction is void + reversal). Bills and
expenses share `purchase/bills` (the `purchase_document` table holds both kinds), filterable by
kind; a dedicated expenses route can come later if needed.

The old `_shell/documents.tsx` route, `DocumentsPage`, and the "Documents" nav entry are
removed.

### Navigation

`app-shell/nav-links.ts` + `nav-documents.tsx` gain two collapsible groups, **Sales** and
**Purchase**, each with its child links. No "document" wording anywhere.

## Editor architecture — shared pieces, distinct surfaces

Share only the parts with real common behavior. The invoice and bill editors own their own form
setup, defaults, labels, mutation mapping, and route behavior. There is **no sales/purchase
toggle** and no giant config-driven editor; the route is already typed, and each surface gets its
own visible shape.

- `components/documents/document-line-items.tsx` — shared line-item table. Owns the
  `useFieldArray` rendering contract: item combobox, description, quantity, unit, rate, account,
  computed line total, and add/remove.
- `components/documents/document-editor-frame.tsx` — shared editor card, sections, sticky
  Save draft / Post footer, and live minor-unit total display.
- `components/documents/document-editor-form.ts` — form-local surface schemas plus line mappers
  into core create/update input contracts.
- Line rate remains directly editable after item selection. Discount fields are intentionally
  deferred until GST core so discount base, tax base, and journal postings land in one contract.
- `components/documents/invoice-editor.tsx` — sales editor. Owns Customer, Invoice date, Due
  date, Income account, Terms/Notes, create/update/post mutation mapping, title "Invoice".
- `components/documents/bill-editor.tsx` — purchase editor. Owns Vendor, Bill date, Due date,
  Vendor reference, Expense account, Notes, Bill/Expense kind selector, create/update/post
  mutation mapping, title "Bill".

Line items use form-local surface schemas that map into the existing
`Create/UpdateSalesDocumentDraftInputSchema` / `...PurchaseDocumentDraftInputSchema` contracts at
submit. The item combobox uses `items.list` search and prefills description, unit, rate, account,
and HSN from the selected item. HSN is displayed as tax-ready metadata only; Phase 03 owns tax
calculation and persisted tax fields.

**Save flow:** explicit **Save draft** (create on first save, then update) → **Post**. No
autosave this slice (avoids autosave/idempotency complexity); autosave is documented as a later
enhancement in `.agents/design-system.md`. New-document **Post** uses one atomic create-and-post
command with a client-stable document ID and operation key, so retry cannot create a second posted
document.

### Settlement forms (receipts / payments)

Same shared-pieces, distinct-surface approach:

- `components/documents/settlement-form.tsx` — base: party, date, amount, cash/bank account,
  payment mode, reference, notes, and an **allocation panel**.
- `receipt-form.tsx` — direction `received`, "Received from", allocate to the party's open
  **sales invoices**; title "Receipt".
- `payment-form.tsx` — direction `paid`, "Paid to", allocate to the party's open **purchase
  documents**; title "Payment".

**Allocation panel:** after party + direction are set, list that party's posted documents with
`outstandingMinor > 0` and let the owner allocate amounts (each ≤ that document's outstanding,
sum must equal the settlement amount). Phase 2.5 does not create advances or unallocated
settlements. This closes the spine's allocation gap (the old UI never sent allocations).

Allocation choices come from a narrow server query, not from client-filtering a paginated register:
`documents.settlements.listAllocationTargets({ orgSlug, partyId, direction })`. The query
returns only posted sales invoices for receipts and posted purchase documents for payments, scoped
to the same party and `outstandingMinor > 0`.

## List pages

Each surface is a single-table list using the design-system primitives (`PageLayout`,
`PageHeader`, `DataTable`, `QueryState`, `DataTableContainer`, `DataTableLoadMore`). Columns are
data; money cells use `formatMinorUnits` + `font-amount tabular-nums`. Row click opens the
`$documentId` route. A primary "New" action routes to `.../new`. Register routes use
`ssr: "data-only"` loaders to seed the first React Query page without server-rendering the full
table shell.

## Backend changes (review fixes folded into the rebuild)

- **Real cursor pagination (review finding 1).** Because surfaces are per-type, each list query
  hits one table. Replace the merge-and-slice with keyset pagination: order by
  `(createdAt desc, id desc)`, `WHERE (createdAt, id) < cursor`, fetch `limit + 1` to derive a
  real `nextCursor`. Drop the hardcoded `nextCursor: null`. Add an optional `direction` filter to
  the settlement list input so receipts vs payments resolve to one surface.
- **Deterministic operation key (review finding 2).** Post/void keys become `${action}:${documentId}`
  (a document posts and voids at most once → naturally unique and stable). A retried intent now
  hits the replay path and returns the cached success instead of a misleading "already posted".
  Remove the random-UUID key. (`DocumentOperationKeySchema` min length 8 still satisfied.)
- **Shared line-total rounding.** Move `calculateLineTotalMinor`'s rounding into `packages/core`
  (e.g. `computeLineTotalMinor`, `computeDocumentTotalMinor`). The DB query layer and the web
  editor both import it so on-screen totals and posted totals round identically. UI money inputs
  use the existing `apps/web/src/utils/accounting-format.ts` `parseDecimalAmountToMinorUnits`;
  delete the local `parseAmountMinor` duplicate (review finding 7).
- **Allocation target query.** Add
  `documents.settlements.listAllocationTargets({ orgSlug, partyId, direction })` backed by
  one table per direction. Receipts return posted sales invoices for that customer; payments
  return posted purchase bills/expenses for that vendor. Both require `outstandingMinor > 0`.
- **Allocation party-match (review finding 3).** When building settlement allocations
  (draft/update) and at post, verify each target document belongs to the settlement's party (in
  addition to the existing direction and outstanding checks). Reject cross-party allocation with
  `DOCUMENT_ALLOCATION_INVALID`.
- **Period-closed domain error (review finding 6).** Add `DOCUMENT_PERIOD_CLOSED`
  to the core domain error enum; `loadPostingPeriod` throws it for locked/closed periods
  instead of the misleading `DOCUMENT_ALREADY_POSTED`. Routers do not convert query
  errors into typed transport errors.

## India-first seams (deferred — Phase 03 GST)

Not built here; the shared line-item pieces and single core contract reserve the seams
(Frappe layering):

- Line gains an `hsnCode` snapshot + tax fields (`taxRate`, `cgst/sgst/igstMinor`).
- Document gains `placeOfSupply` (state code captured at document time).
- Business settings gain seller GSTIN + registered state (drives intra- vs inter-state GST).
- A tax-template / tax-rate construct and a per-document tax summary table.

The item combobox already surfaces HSN, so the editor needs no structural change to add these.

## Out of scope

PDF/HTML/OG rendering and the template package; share links / email / delivery; AI/LLM flows;
autosave; GST calculation and tax lines; bank import; credit/debit notes; a dedicated expenses
route; sales/purchase overview dashboards (index routes just redirect).

## Testing

- **Core:** `computeLineTotalMinor` / `computeDocumentTotalMinor` rounding tests (half-up,
  sub-rupee edges).
- **DB integration:** keyset cursor pagination (ordering + `nextCursor` across a page boundary);
  deterministic-key post/void replay (retry returns cached result, no second number/journal);
  allocation target query scoping; allocation party-match rejection; receipts/payments direction
  filter.
- **Web:** browser smoke of all four surfaces — draft → post → void for an invoice and a bill,
  and a receipt that allocates against an open invoice.

## Decisions / defaults chosen (open to change in spec review)

- Structured editor is the permanent entry model; WYSIWYG rejected for India GST (the document
  is generated from structured input). Rendered preview + PDF deferred as a read-only template.
- Route group names: `sales` and `purchase` (singular).
- Bills and expenses share `purchase/bills`; no separate expenses route yet.
- Editor lives at dedicated child routes (`/new`, `/$documentId`), not a sheet.
- Explicit Save-draft / Post, no autosave this slice.
- Sequence backfill for pre-existing fiscal years (review finding 5) is deferred in this slice:
  document tables and sequences are greenfield here. Add a separate data migration only when
  a deployment target already has non-onboarding fiscal years that need document numbering.
