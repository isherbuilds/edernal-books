# Phase 02 Reference Architecture Research

Date: 2026-06-27
Status: Research note
Local concern: Phase 2 parties and item/service catalog foundation

2026-06-28 extension: also informs
`docs/superpowers/plans/2026-06-28-phase-02-5-document-spine-plan.md`.

References inspected:

- `frappe/books` in `/tmp/frappe-books`
- `frappe/erpnext` in `/tmp/frappe-erpnext`
- `midday-ai/midday` in `/tmp/midday`

GitHub metadata was checked with `gh-axi`; representative source was inspected from shallow clones in `/tmp`.

## Reference Pattern Summary

### Frappe Books

Representative files:

- `/tmp/frappe-books/schemas/app/Party.json`
- `/tmp/frappe-books/models/baseModels/Party/Party.ts`
- `/tmp/frappe-books/schemas/app/Item.json`
- `/tmp/frappe-books/models/baseModels/Item/Item.ts`
- `/tmp/frappe-books/schemas/app/Invoice.json`
- `/tmp/frappe-books/schemas/app/SalesInvoice.json`
- `/tmp/frappe-books/schemas/app/PurchaseInvoice.json`
- `/tmp/frappe-books/models/Transactional/Transactional.ts`
- `/tmp/frappe-books/models/baseModels/Payment/Payment.ts`
- `/tmp/frappe-books/templates`
- `/tmp/frappe-books/schemas/app/inventory/InventorySettings.json`

Useful patterns:

- A single `Party` model supports `Customer`, `Supplier`, and `Both`.
- Party default account depends on role: receivable for customers, payable for suppliers.
- Item separates product/service type from sales/purchase purpose.
- Item has default sales and purchase accounts.
- Sales and purchase invoices share a submittable invoice base.
- Transactional documents submit by creating ledger postings and cancel by
  creating reversing postings.
- Payment allocates against sales or purchase invoices.
- Print templates show the input/output shape needed later for invoices and
  receipts: from/bill-to, dates, document number, line items, totals, payment
  details, terms/notes, and template settings.
- Inventory is opt-in through explicit `trackItem`, batch, serial number, and inventory settings fields.

Risk for this repo:

- Frappe Books puts too much inventory/tax/POS shape into the item model for our Phase 2 slice.
- Required item income/expense accounts would force accounting decisions before invoice posting is designed.
- Frappe returns, stock transfers, loyalty, pricing rules, and template builder
  behavior belong to later phases, not Phase 2.5.

### ERPNext

Representative files:

- `/tmp/frappe-erpnext/erpnext/selling/doctype/customer/customer.json`
- `/tmp/frappe-erpnext/erpnext/buying/doctype/supplier/supplier.json`
- `/tmp/frappe-erpnext/erpnext/accounts/doctype/party_account/party_account.json`
- `/tmp/frappe-erpnext/erpnext/accounts/doctype/party_link/party_link.json`
- `/tmp/frappe-erpnext/erpnext/stock/doctype/item/item.json`

Useful patterns:

- Mature ERP keeps Customer and Supplier as separate doctypes, then supports links between party roles.
- Party account defaults are company-specific overrides, not global properties.
- Item separates `is_stock_item`, `is_sales_item`, and `is_purchase_item`.
- ERPNext explicitly describes stock-maintained items as creating stock ledger entries.

Risk for this repo:

- Separate customer/supplier tables plus party links are too much for owner-first Phase 2.
- ERPNext item carries manufacturing, stock, reorder, tax, supplier, variant, asset, and quality fields that belong to later roadmap phases.

### Midday

Representative files:

- `/tmp/midday/packages/db/src/schema.ts`
- `/tmp/midday/packages/db/src/queries/customers.ts`
- `/tmp/midday/packages/db/src/queries/invoice-products.ts`
- `/tmp/midday/apps/api/src/chat/prompt.ts`
- `/tmp/midday/apps/api/src/mcp/tools/invoices.ts`
- `/tmp/midday/packages/invoice/src/types.ts`
- `/tmp/midday/packages/invoice/src/templates/pdf/index.tsx`
- `/tmp/midday/apps/api/src/trpc/routers/customers.ts`
- `/tmp/midday/apps/api/src/trpc/routers/invoice-products.ts`
- `/tmp/midday/apps/dashboard/src/components/forms/product-form.tsx`
- `/tmp/midday/apps/dashboard/src/components/invoice/form.tsx`

Useful patterns:

- Customer rows are team scoped and include searchable contact/address fields.
- Product rows are scoped, active/inactive, searchable, and carry default price, unit, and currency.
- Product usage count and recency improve invoice line autocomplete.
- API keeps team scope in context and does not trust client-provided tenant ids.
- AI/chat invoice tools create or update drafts first. They resolve customers
  before creation, never silently send invoices, and keep invoice numbers
  system-generated.
- Midday has draft-first invoice UX and assistant guardrails, but not an
  accounting `POSTED` state. Its draft invoice number behavior should inform UX
  caution, not replace this repo's post-time `number_sequence` invariant.
- Invoice rendering is isolated into a package-level template/PDF boundary.

Risk for this repo:

- Midday is sales-invoice oriented and has no vendor/purchase item side.
- Full-text search, enrichment, portals, and usage analytics are useful later but too broad for the first Phase 2 migration.
- Midday's JSON-heavy invoice snapshot and SaaS statuses should not replace
  this repo's typed accounting document rows or `DRAFT -> POSTED -> VOIDED`
  lifecycle.

## Local Mismatch Or Opportunity

Local repo has strong organization-scoped accounting primitives, split Drizzle schema files, shared Zod contracts in `packages/core`, oRPC procedures with organization permission middleware, and UI records navigation.

Phase 2 should follow local architecture rather than clone reference frameworks:

- Use one organization-scoped `party` table with `kind: customer | vendor | both`.
- Use one organization-scoped `item` table with `kind: goods | service` and `usage: sales | purchases | both`.
- Keep item sales/expense accounts optional until posting rules are implemented.
- Include optional default sales/purchase rates now because invoice and expense lines will need owner-friendly defaults.
- Exclude inventory flags entirely. Adding `goods` does not mean stock tracking.

## Adopt

- Adopt Frappe Books party `Both` concept.
- Adopt Frappe Books and ERPNext split between item type and sales/purchase usability.
- Adopt Frappe Books transactional submit/cancel insight as explicit local
  service functions: post document, create journal entry, void with
  reversal.
- Adopt ERPNext clarity that stock-maintained items create stock ledger entries; this justifies keeping stock out of Phase 2.
- Adopt Midday active/inactive product records and default rate/unit fields.
- Adopt Midday-style tenant scope through server context, mapped to local `organizationPermissionProcedure`.
- Adopt Midday AI-native contract discipline for later Phase 5: assistant tools
  draft first, resolve parties/items first, and require explicit confirmation
  before post/send/void.

## Adapt

- Adapt ERPNext company-specific party accounts to local organization-specific optional item account defaults.
- Adapt Midday product search to simple organization-scoped `ILIKE` first; full-text search can wait until catalog size proves need.
- Adapt Midday product recency/usage later for invoice autocomplete, not in the first schema slice.
- Adapt Midday invoice PDF package boundary later, while keeping accounting rows
  typed and relational.
- Adapt Frappe printable input/output fields for PDF composition later, but not
  the full template builder in Phase 2.5.

## Avoid

- Avoid separate Customer and Supplier tables in Phase 2.
- Avoid Party Link equivalent until the single party table fails real workflows.
- Avoid Frappe/ERPNext inventory flags, batch/serial fields, stock ledger fields, reorder fields, warehouse fields, and manufacturing fields.
- Avoid Frappe returns, credit/debit note behavior, stock transfers, loyalty,
  pricing rules, and tax behavior until their roadmap phases.
- Avoid Midday customer enrichment, customer portal, and public customer tokens in Phase 2.
- Avoid making sales/expense account defaults required before invoice and expense posting rules exist.
- Avoid implementing LLM assistant flows in Phase 2.5; only keep deterministic
  APIs easy for a future assistant to call.

## Minimal Next-Step Plan

1. Keep Phase 2 foundation centered on parties and items.
2. Update implementation plan to include `item.usage`.
3. Keep party `both`.
4. Add optional item sales/purchase default rates and optional account defaults.
5. Use the Phase 2.5 document spine plan for invoice, purchase bill,
   settlement, allocation, lifecycle, and future AI/PDF boundaries.
6. Start implementation only after spec approval and local Postgres DB gate is available.
