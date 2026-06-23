# 0005. TanStack Start hybrid SSR performance architecture

Date: 2026-06-22

## Status

Accepted.

## Context

Edernal Books is an accounting application. Most protected pages will become data-heavy: ledgers,
transactions, invoices, reconciliation, imports, and reports. The app is still pre-production, so
we can choose the architecture now without preserving legacy route behavior.

TanStack Start renders initial matched routes on the server by default. It also supports selective
SSR per route:

- `ssr: true` runs route guards, loaders, and component rendering on the server for the initial
  request.
- `ssr: "data-only"` runs route guards and loaders on the server, but renders the component on the
  client.
- `ssr: false` skips server route execution and server component rendering for that route.

We also use TanStack Query as the data cache through
`setupRouterSsrQueryIntegration`. Router loader events should pass through to Query; Query decides
freshness.

## Decision

Use a hybrid selective SSR architecture.

- Public, guest, legal, auth, app shell, and detail pages use `ssr: true`.
- Heavy accounting list pages use `ssr: "data-only"`.
- Browser-only workspaces use `ssr: false`.
- Route loaders seed TanStack Query with `queryClient.ensureQueryData`.
- Components read the same data from TanStack Query.
- Router `defaultPreloadStaleTime` remains `0` so TanStack Query owns freshness.
- oRPC remains the domain API boundary for accounting CRUD and list endpoints.
- `packages/core` owns validation and transport contracts.
- `packages/db` owns reusable query helpers and transaction boundaries.
- Web routes should not accumulate direct database access.
- Accounting lists use cursor pagination by default. Offset/page pagination is reserved for small,
  slow-changing admin/settings tables where direct page numbers are part of the UX.

Detailed implementation examples live in
[Accounting Application Architecture Playbook](../accounting-application-architecture-playbook.md).

## Route policy

| Route type                            | SSR mode                                | Data pattern                                               |
| ------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Public marketing/legal                | `ssr: true`                             | Direct render or small loaders                             |
| Login/signup                          | `ssr: true`                             | Redirect guards only                                       |
| Protected app shell                   | `ssr: true`                             | Auth, organization, navigation data                        |
| Dashboard                             | `ssr: true`                             | Server seed cheap summary data; lazy heavy charts          |
| Transactions/invoices/customers lists | `ssr: "data-only"`                      | Server seed first cursor page; client renders table        |
| Invoice/customer detail               | `ssr: true`                             | Server render useful document/detail HTML                  |
| File imports/reconciliation workspace | `ssr: false` when browser APIs dominate | Client-only workspace, server mutations after confirmation |

## URL state policy

- Server data state: cursor, committed search, sort, date range, account/customer/vendor filters.
- Client-only table state: selected row, drawer tab, column visibility, density, temporary filter
  draft.
- Use TanStack Router search params for canonical, shareable state.
- Use shallow URL state for client-only table state that must not rerun route loaders.

## Performance rules

- List endpoints must paginate and clamp `limit` server-side.
- Cursor pagination is the default for accounting lists.
- Cursor order must include a unique tie-breaker, usually `id`.
- Default cursor page size is 30; maximum page size is 100.
- Offset/page pagination is an exception for small admin/settings tables.
- Search endpoints must debounce on the client and cap result count.
- Heavy dependencies such as charts, import parsers, reconciliation engines, and editors load behind
  route or component boundaries.
- Query TTLs should be domain-specific rather than one global value.

## Examples

Cursor list contract:

```ts
export const InvoiceListInputSchema = OrgSlugInputSchema.extend({
  cursor: CursorTokenSchema.optional(),
  fromDate: z.iso.date().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  q: z.string().trim().max(200).optional(),
  toDate: z.iso.date().optional()
}).strict();
```

TanStack Start data-only list route:

```tsx
export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices")({
  ssr: "data-only",
  loader: ({ context, params, search }) =>
    context.queryClient.ensureInfiniteQueryData(
      invoiceInfiniteOptions({ orgSlug: params.orgSlug, filters: search })
    ),
  component: InvoiceListPage
});
```

Cursor query rule:

```ts
const rows = await db
  .select(invoiceListColumns)
  .from(sourceDocument)
  .where(and(...conditions))
  .orderBy(asc(sourceDocument.postingDate), asc(sourceDocument.id))
  .limit(limit + 1);

const page = rows.slice(0, limit);
const last = page.at(-1);
const nextCursor = rows.length > limit && last ? encodeCursor([last.postingDate, last.id]) : null;
```

## Consequences

Initial protected pages keep SSR benefits: no auth flash, server redirects, and query dehydration.
Heavy list pages avoid shipping and hydrating large server-rendered tables. Browser-only workspaces
avoid brittle SSR guards around file APIs and local-only state.

This is not a full SPA. It is also not full SSR everywhere. The default is SSR, with explicit route
exceptions for performance.

## Sources

- [TanStack Start selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr.md)
- [TanStack Router data loading and external cache](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- [TanStack Router preloading](https://tanstack.com/router/latest/docs/framework/react/guide/preloading)
- [TanStack Query infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Sayr TanStack Start app](https://github.com/dorasto/sayr/tree/main/apps/start)
- [Sayr shallow URL state hook](https://github.com/dorasto/sayr/blob/main/apps/start/src/hooks/useTasksSearchParams.ts)
- [Midday dashboard source](https://github.com/midday-ai/midday/tree/main/apps/dashboard/src)
- Internal reference: temp Edernal Books cursor helper.
- Internal reference: temp Edernal Books invoice service.
- Internal reference: temp Edernal Books document list query setup.
- Internal reference: temp Edernal Books route-first accounting workflows ADR.
