# Phase 02 Reference Architecture Research

Date: 2026-06-27
Status: Research note
Local concern: Phase 2 parties and item/service catalog foundation

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
- `/tmp/frappe-books/schemas/app/inventory/InventorySettings.json`

Useful patterns:

- A single `Party` model supports `Customer`, `Supplier`, and `Both`.
- Party default account depends on role: receivable for customers, payable for suppliers.
- Item separates product/service type from sales/purchase purpose.
- Item has default sales and purchase accounts.
- Inventory is opt-in through explicit `trackItem`, batch, serial number, and inventory settings fields.

Risk for this repo:

- Frappe Books puts too much inventory/tax/POS shape into the item model for our Phase 2 slice.
- Required item income/expense accounts would force accounting decisions before invoice posting is designed.

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
- `/tmp/midday/apps/api/src/trpc/routers/customers.ts`
- `/tmp/midday/apps/api/src/trpc/routers/invoice-products.ts`
- `/tmp/midday/apps/dashboard/src/components/forms/product-form.tsx`

Useful patterns:

- Customer rows are team scoped and include searchable contact/address fields.
- Product rows are scoped, active/inactive, searchable, and carry default price, unit, and currency.
- Product usage count and recency improve invoice line autocomplete.
- API keeps team scope in context and does not trust client-provided tenant ids.

Risk for this repo:

- Midday is sales-invoice oriented and has no vendor/purchase item side.
- Full-text search, enrichment, portals, and usage analytics are useful later but too broad for the first Phase 2 migration.

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
- Adopt ERPNext clarity that stock-maintained items create stock ledger entries; this justifies keeping stock out of Phase 2.
- Adopt Midday active/inactive product records and default rate/unit fields.
- Adopt Midday-style tenant scope through server context, mapped to local `organizationPermissionProcedure`.

## Adapt

- Adapt ERPNext company-specific party accounts to local organization-specific optional item account defaults.
- Adapt Midday product search to simple organization-scoped `ILIKE` first; full-text search can wait until catalog size proves need.
- Adapt Midday product recency/usage later for invoice autocomplete, not in the first schema slice.

## Avoid

- Avoid separate Customer and Supplier tables in Phase 2.
- Avoid Party Link equivalent until the single party table fails real workflows.
- Avoid Frappe/ERPNext inventory flags, batch/serial fields, stock ledger fields, reorder fields, warehouse fields, and manufacturing fields.
- Avoid Midday customer enrichment, customer portal, and public customer tokens in Phase 2.
- Avoid making sales/expense account defaults required before invoice and expense posting rules exist.

## Minimal Next-Step Plan

1. Keep Phase 2 foundation centered on parties and items.
2. Update implementation plan to include `item.usage`.
3. Keep party `both`.
4. Add optional item sales/purchase default rates and optional account defaults.
5. Start implementation only after spec approval and local Postgres DB gate is available.
