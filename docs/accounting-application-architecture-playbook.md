# Accounting Application Architecture Playbook

Date: 2026-06-22

This playbook records the reusable architecture decisions for Edernal Books as an
accounting application. Midday is the closest commercial reference for product
shape, but these rules are not limited to Midday. They combine TanStack Start
documentation, local repo constraints, Sayr performance patterns, and the
finance-first reference repo used during architecture research.

## Core Position

Use TanStack Start as a hybrid selective SSR app:

- full SSR for public, guest, auth, app shell, and detail pages;
- data-only SSR for heavy accounting lists;
- client-only routes only for browser-bound workspaces;
- TanStack Query as the server-state cache;
- oRPC as the domain API boundary;
- Drizzle query helpers as the persistence boundary;
- pure accounting rules in package code, not route files.

This is not a full SPA. This is also not full SSR everywhere.

## Route Policy

| Page type                             | Route SSR mode                | Why                                                   |
| ------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| Public/legal/auth                     | `ssr: true`                   | SEO, redirects, stable first paint                    |
| App shell/org guard                   | `ssr: true`                   | no auth flash, server redirect, org bootstrap         |
| Dashboard                             | `ssr: true`                   | summary data useful in first HTML; lazy heavy charts  |
| Ledger/invoice/customer/vendor lists  | `ssr: "data-only"`            | server seed data, avoid server-rendering large tables |
| Invoice/bill/customer detail          | `ssr: true`                   | direct links should render useful document detail     |
| Import/reconciliation/file workspaces | `ssr: false` only when needed | File APIs, parsers, browser-only local state          |

Example heavy list route:

```tsx
export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices")({
  ssr: "data-only",
  validateSearch: zodValidator(InvoiceListSearchSchema),
  loader: ({ context, params, search }) =>
    context.queryClient.ensureInfiniteQueryData(
      invoiceInfiniteOptions({
        orgSlug: params.orgSlug,
        filters: search
      })
    ),
  component: InvoiceListPage
});
```

Example detail route:

```tsx
export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices/$invoiceId")({
  ssr: true,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      invoiceDetailOptions({
        invoiceId: params.invoiceId,
        orgSlug: params.orgSlug
      })
    ),
  component: InvoiceDetailPage
});
```

## Query And Hydration Policy

Keep router cache bypassed for data freshness. Query owns cache rules.

```tsx
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0
});

setupRouterSsrQueryIntegration({
  router,
  queryClient,
  handleRedirects: true,
  wrapQueryClient: false
});
```

Use route loaders to seed Query, then read from Query in components:

```tsx
const invoicesOptions = (input: InvoiceListInput) =>
  orpc.accounting.invoices.list.infiniteOptions({
    initialPageParam: null as string | null,
    input: (cursor) => ({
      ...input,
      ...(cursor ? { cursor } : {})
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });

function InvoiceListPage() {
  const { orgSlug } = Route.useParams();
  const search = Route.useSearch();
  const query = useInfiniteQuery(invoicesOptions({ orgSlug, ...search }));

  return <InvoiceTable pages={query.data?.pages ?? []} />;
}
```

## Cursor-First Pagination

Cursor pagination is the default for accounting lists. Offset/page pagination is
allowed for tiny admin tables, settings lists, or explicit "page 3 of 8" UX.

Use cursor pagination when:

- list can grow beyond a few hundred rows;
- data changes while user scrolls;
- sort is stable by domain fields such as posting date, code, name, or created time;
- infinite scroll, load-more, or virtual table UI is likely.

Use offset pagination only when:

- total page count is a primary UX requirement;
- data set is small and slow-changing;
- admin table benefits from direct page number jumps.

Default list contract:

```ts
export const CursorPaginatedInputSchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.number().int().min(1).max(100).default(30)
});

export const CursorPaginatedOutputSchema = z.object({
  nextCursor: z.string().min(1).max(512).nullable()
});
```

Database pattern:

```ts
const limit = clampCursorLimit(input);
const cursor = input.cursor ? decodeDateUuidCursor(input.cursor) : null;

const rows = await db
  .select(invoiceListColumns)
  .from(sourceDocument)
  .where(
    and(
      eq(sourceDocument.organizationId, orgId),
      eq(sourceDocument.type, "sales_invoice"),
      cursor
        ? sql`(${sourceDocument.postingDate}, ${sourceDocument.id}) > (${cursor.date}::date, ${cursor.id}::uuid)`
        : undefined
    )
  )
  .orderBy(asc(sourceDocument.postingDate), asc(sourceDocument.id))
  .limit(limit + 1);

const page = rows.slice(0, limit);
const last = page.at(-1);

return {
  invoices: page,
  nextCursor:
    rows.length > limit && last ? encodeCursor([toDateOnly(last.postingDate), last.id]) : null
};
```

Cursor rules:

- Always include a unique tie-breaker, usually `id`.
- Cursor fields must match `orderBy`.
- Fetch `limit + 1`, return `limit`, emit `nextCursor` only when extra row exists.
- Validate and bound cursor tokens.
- Do not expose raw SQL offsets for accounting ledgers, invoices, bank lines, or journals.
- Count queries are optional and should only run on the first page or on explicit request.

## URL State Policy

Server data state belongs in TanStack Router search params:

- committed search;
- date range;
- status filters;
- account/customer/vendor filters;
- sort field and sort direction.

Client-only table state belongs in shallow URL state or Query local state:

- selected row;
- drawer tab;
- column visibility;
- density;
- draft search text before submit/debounce.

Example:

```tsx
const { searchParams, setSearchParams } = useShallowSearchParams();

function selectInvoice(invoiceId: string | null) {
  setSearchParams({ selectedInvoice: invoiceId });
}
```

This mirrors Sayr's TanStack Start workaround: table-only URL changes should not
trigger full route navigation, `beforeLoad`, or `loader` reruns.

## Route-First Accounting Workflows

Financial documents need durable pages, not modal-first UX.

Use routes for:

- sales invoice create/detail/edit;
- purchase bill create/detail/edit;
- receipt/payment detail;
- journal review/reversal;
- bank reconciliation workspace;
- import mapping and validation;
- reports with filters that need sharing.

Use dialogs only for bounded tasks:

- confirm void/archive;
- allocate receipt/payment;
- invite member;
- small create-in-place selectors.

This follows the temp reference's route-first decision and fits accounting
workloads better than modal-heavy CRUD.

## Search And Selector Policy

- Command search: debounce around 200 ms, minimum 2 chars, small per-type limit.
- List search: debounce around 400 ms, max 200 chars.
- Selector search: debounce around 250 ms, minimum 2 chars, limit around 20.
- Search endpoints must cap results server-side.
- Global search can use per-type limits to prevent one domain from starving others.

Example selector search:

```ts
export const PartySelectorSearchInputSchema = z.object({
  orgSlug: OrgSlugInputSchema.shape.orgSlug,
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(20).default(20)
});
```

## Heavy Dependency Policy

Lazy-load dependencies that do not belong in the shell:

- charting libraries;
- PDF preview/render helpers;
- spreadsheet/CSV parsers;
- reconciliation engines;
- rich editors;
- AI chat surfaces.

Example:

```tsx
const CashMovementChart = lazy(() =>
  import("./cash-movement-chart").then((module) => ({ default: module.CashMovementChart }))
);

<Suspense fallback={<div className="h-[280px] w-full animate-pulse rounded-md bg-muted" />}>
  <CashMovementChart config={chartConfig} data={cashFlowData} />
</Suspense>;
```

## Adopt, Adapt, Avoid

Adopt:

- Midday-style flat web folders: `routes`, `components`, `hooks`, `lib`, `providers`.
- TanStack Start selective SSR.
- TanStack Query SSR integration with `defaultPreloadStaleTime: 0`.
- Cursor pagination for accounting lists.
- Route-first document workflows.
- Debounced, bounded search.
- Lazy heavy route/component chunks.

Adapt:

- Midday team/org access patterns into Better Auth + oRPC procedure middleware.
- Sayr shallow URL state into generic `useShallowSearchParams`.
- Temp reference cursor helpers into `packages/core` contracts and `packages/db` helpers.

Avoid:

- Full SPA rewrite.
- Full SSR for every heavy grid.
- Raw offset pagination for ledgers and documents.
- Modal-first financial document editors.
- Framework-specific Next.js/Supabase/RSC mechanics from references.
- Direct database access from TanStack route files.

## Sources

- TanStack Start selective SSR:
  <https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr.md>
- TanStack Router data loading and external cache:
  <https://tanstack.com/router/latest/docs/framework/react/guide/data-loading>
- TanStack Router preloading and `defaultPreloadStaleTime: 0`:
  <https://tanstack.com/router/latest/docs/framework/react/guide/preloading>
- TanStack Query infinite queries:
  <https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries>
- Sayr TanStack Start app:
  <https://github.com/dorasto/sayr/tree/main/apps/start>
- Sayr shallow task URL state:
  <https://github.com/dorasto/sayr/blob/main/apps/start/src/hooks/useTasksSearchParams.ts>
- Sayr task view architecture note:
  <https://github.com/dorasto/sayr/blob/main/apps/start/TASK_VIEW_SYSTEM.md>
- Midday dashboard source:
  <https://github.com/midday-ai/midday/tree/main/apps/dashboard/src>
- Internal research reference: cursor helper.
- Internal research reference: invoice list.
- Internal research reference: list query setup.
- Internal research reference: route-first accounting workflow ADR.
