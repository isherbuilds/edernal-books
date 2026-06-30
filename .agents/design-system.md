# Design System & Page Composition

Use this when building or restyling any **authenticated app page** (records, accounting,
reports, settings, dashboard). It is the visual/composition counterpart to
[UI guidelines](./ui.md) (which covers extraction decisions and package boundaries) and
[TanStack patterns](./tanstack-patterns.md) (route/loader placement).

The look is Midday-style — lightweight, flat, full-width data tables — built entirely from
the repo's own theme tokens (no hardcoded hex), so dark mode and the lime theme stay intact.

## Foundations (don't reinvent)

- **Theme**: shadcn `base-nova`, `neutral` base, `lime` theme, `sky` charts, OKLCH tokens, full
  dark mode. Reference tokens by name — never raw colors or `text-gray-*`.
  - Surfaces: `bg-background` (page), `bg-card` (raised), `bg-secondary` (chips/badges), `bg-muted` (subtle fills).
  - Text: `text-foreground`, `text-muted-foreground` (secondary copy), `text-destructive` (errors).
  - Lines/radius: `border`, `border-dashed` (empty frames), `rounded-lg`.
- **Type**: Inter Variable everywhere. Headings `text-2xl font-semibold tracking-normal`; body `text-sm`.
- **Money**: integer minor units, formatted with `formatMinorUnits(...)`, rendered with
  `font-amount tabular-nums` (the serif `--font-amount` family + fixed-width digits). This is the
  single rule for every monetary cell/total. Dates use `tabular-nums` only (no `font-amount`).
- **Icons**: `lucide-react`, sized `size-4` for inline/action glyphs or `size-5` for empty-state media.

## Shared page primitives

Compose every app page from these. Prefer them over hand-rolling headers, tables, or read-states.

| Primitive                        | File                         | Purpose                                                                                                                      |
| -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PageLayout`                     | `components/page-layout.tsx` | The one `<main>` container: `mx-auto max-w-6xl`, padding, `bg-background`, `gap-6`.                                          |
| `PageHeader`                     | `components/page-layout.tsx` | Title → description, with an optional right-aligned `actions` slot. No visible route/category label above the title.         |
| `EmptyState` / `NoResults`       | `components/page-layout.tsx` | First-run vs filtered-to-empty states (dashed frame).                                                                        |
| `QueryState`                     | `components/query-state.tsx` | The loading / error / empty / success switch. Replaces hand-rolled `isLoading`/`isError` ladders and per-page `ErrorBlock`s. |
| `DataTable<T>` / `DataColumn<T>` | `components/data-table.tsx`  | Column-driven table (Midday `columns` + render, no `@tanstack/react-table`). Optional `footer` slot for report totals.       |
| `DataTableContainer`             | `components/data-table.tsx`  | Bordered, rounded frame around a table + its pagination.                                                                     |
| `DataTableLoadMore`              | `components/data-table.tsx`  | Centered "Load more" with inline pending spinner.                                                                            |

List/CRUD pages add the records kit from `components/records/records-shell.tsx`:
`RecordsPageLayout` (header + page), `RecordsToolbar` (search left, filters/action right),
`RecordSearchField`, `RecordFilterMenu`, `RecordFilterPills`, `RecordPrimaryAction`, `RecordSheet`
(URL-driven create/edit), `RecordActiveBadge`, `RecordRowActions`.

## The standard page shape

```tsx
<PageLayout>
  <PageHeader title="Trial balance" description="…" actions={/* optional buttons */} />

  {/* optional: report filter row (flat flex/grid, NOT a Card) */}

  <QueryState isLoading={…} isError={…} error={…} errorTitle="…" errorFallback="…"
    isEmpty={rows.length === 0} empty={<EmptyState … />}>
    <DataTableContainer>
      <DataTable columns={columns} rows={rows} getRowId={(r) => r.id}
        minWidthClassName="min-w-[760px]" footer={/* totals row, optional */} />
    </DataTableContainer>
  </QueryState>
</PageLayout>
```

Columns are data — per-entity header differences are just different `DataColumn[]` entries:

```ts
const columns: DataColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, cellClassName: "font-medium" },
  { id: "amount", header: "Amount", align: "right",
    cell: (r) => formatMinorUnits(r.amountMinor), cellClassName: "font-amount tabular-nums" },
  { id: "actions", header: <span className="sr-only">Actions</span>,
    headClassName: "w-12", stopRowClick: true, align: "right", cell: (r) => <RowActions … /> },
];
```

## Rules

- **One container, one header.** Never re-declare the `bg-muted/30` + hand-built header block; use
  `PageLayout` + `PageHeader`. Don't wrap whole pages in `Card` — Card is for genuinely raised,
  self-contained panels, not the default page frame.
- **All read-states go through `QueryState`.** Don't copy `ErrorBlock` into a page.
- **Tables are column-driven.** Add/relabel/reorder a column by editing the `DataColumn[]`, not by
  writing new `<Table>` markup. Use the `footer` slot for totals (e.g. trial balance).
- **List pages keep state in the URL** (`validateSearch` + `Route.useSearch()`), open create/edit in a
  `RecordSheet` via `view`/`id` search params. See [TanStack patterns](./tanstack-patterns.md).
- **Money** is always `formatMinorUnits` + `font-amount tabular-nums`.
- **Immutable data shows it.** Posted journal entries have no row-click/edit affordance — correction is
  reversal only. Don't add edit handlers to immutable rows.
- **i18n**: new app copy uses Paraglide `m.*` keys (recompile with `vp run --filter @tsu-stack/i18n build`).
  The accounting pages still carry literal English pending an i18n pass — match the surrounding file
  when editing them, and prefer `m.*` for anything new.

## India / accounting specifics

- **Parties** carry GST fields: `gstRegistrationType`
  (`registered_regular` | `registered_composition` | `unregistered` | `consumer`), `gstin`, `pan`.
  GSTIN/PAN are format-validated in `packages/core/src/parties` and normalized (trim + uppercase) server-side.
- **Items** carry an `hsnCode` (HSN for goods / SAC for services) — a 4–8 digit code validated in
  `packages/core/src/items`, searchable, and required for GST-compliant invoicing.

## Document editor & templates (invoices, bills, settlements)

The primitives above cover registers and simple records. Invoices, bills, receipts, and
payments need richer **structured editors** and, later, renderable output. Learn Midday's
_code composition_ (shared contracts, template-package boundary, immutability); do
**not** copy its WYSIWYG UX — an India GST document is generated from structured input,
not typed into a rendered layout.

References (Midday, for composition only): `apps/dashboard/src/components/invoice/{form,form-context,line-items,invoice-editor}.tsx`;
`packages/invoice/src/{index,types}.tsx`; `packages/invoice/src/templates/{html,pdf,og}/`.

- **Structured entry, generated output.** The editor is a labelled form + line-items table,
  not a WYSIWYG canvas. The entry surface (party, lines, rates, HSN) is much smaller than the
  output: a compliant invoice's tax breakup, totals, and amount-in-words are _computed_, not
  typed, and its layout is statutory. The on-screen preview and the PDF are the _same document
  data_ run through one template — but that rendered output is a **read-only generated artifact**
  (on-demand preview / download / tokenized share route), never an editable surface.
- **Compose shared leaves, not a config base.** Extract the complex, identical pieces —
  line-items table, totals strip, party combobox, account picker, allocation panel,
  Save-draft/Post action bar. Each surface page (`invoice-editor`, `bill-editor`,
  `receipt-form`, `payment-form`) composes those leaves directly with its own labels and
  fields. No single base editor taking a `{party, account, kind}` config object — that thin
  abstraction is the anti-pattern (CLAUDE.md: option factories / thin wrappers are suspect).
- **One shared document contract.** Define persistence commands and DTOs once in
  `packages/core`. Editor-local schemas may normalize UI-only strings (rates, quantity, common
  `accountId`) but must map directly into those core commands at submit. Preview and PDF consume
  core DTOs so rendered output never drifts from posted data.
- **Template package boundary.** PDF/HTML rendering lives in a dedicated package (e.g.
  `packages/invoice` or `packages/documents`) exporting `templates/html` + `templates/pdf`
  from that one shape, built on `@react-pdf/renderer` (lean, no headless browser; register
  Inter via `Font.register`). The app imports rendered output; it never reimplements the
  layout. Renderable output is **not** the accounting source of truth (decisions/0009).
- **Line-item editing.** react-hook-form `FormProvider` + `useFieldArray` for lines
  (add/remove only). Keep at least one line. Columns are a CSS grid driven by the same feature
  flags — "columns are data," same rule as `DataTable`. Per-line totals are always computed,
  never stored in form state. Rate stays directly editable; discount fields wait for GST/tax
  accounting so totals, tax base, and journal postings are designed together.
- **Draft saving.** Explicit **Save draft** (create on first save, then update) → **Post**.
  New-document Post uses an atomic create-and-post command with a client-stable document ID and
  operation-local idempotency key. "Changed vs baseline" is a UI optimization, never the
  write-dedupe (CLAUDE.md replay rule). Debounced autosave is an optional later enhancement under
  the same key rule, not a default.
- **Posted = no editor.** Posted documents are immutable: render read-only, no edit affordance,
  correction is void + reversal. Same rule as posted journal rows.
- **Money stays minor units.** Midday uses floats + `Intl.NumberFormat`; we deviate on purpose.
  Totals compute in `packages/core` with explicit rounding; cells render with `formatMinorUnits`
  - `font-amount tabular-nums` — never `font-mono`, never raw Intl currency in a cell. When we
    add PDF, note `@react-pdf/renderer` strips minus signs — format the absolute value and prepend `-`.
- **Nested fields read context.** Document sub-fields use `useFormContext()` / `useWatch()`, not
  prop drilling.

## Adopting it on a new page

1. Wrap in `PageLayout` + `PageHeader`.
2. Declare `DataColumn<T>[]`; render `DataTable` inside `DataTableContainer`.
3. Route reads/loading/empty through `QueryState` with `EmptyState`/`NoResults`.
4. For CRUD, reuse the records shell (toolbar + `RecordSheet`) and keep list state in the URL.
5. Run `vp check --fix` (package-local) or `vp run -w fix` (cross-package).
