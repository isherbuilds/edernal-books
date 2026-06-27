# TanStack Patterns

Use this when working with TanStack Start routes, route structure, `beforeLoad`,
route-level React Query preloading, and page composition.

This guide is intentionally focused on TanStack Router and TanStack Start. For
data hooks, use [API fetching patterns](./api-fetching-patterns.md). For forms,
use [Form patterns](./forms.md).

## Web App Shape

`apps/web/src` follows a Midday-style app structure:

```text
src/
  routes/       TanStack file routes only
  components/   app UI components
  hooks/        React hooks and TanStack Query hooks
  utils/        pure helpers, formatters, options, defaults
  lib/          app services and integration glue
  providers/    React provider components
  styles/       global styles
  config/       app constants and config
```

Do not add `features/`, `pages/`, `widgets/`, `entities/`, or `shared/` in
`apps/web/src`. Do not add top-level `api/`.

## Route Hierarchy

Use TanStack-native `_` pathless routes for URL-less grouping and layouts:

```text
routes/{-$locale}/
  route.tsx
  _public/
    route.tsx
    index.tsx
    home.tsx
    privacy-policy.tsx
    terms-of-service.tsx
  _guest/
    route.tsx
    login.tsx
    signup.tsx
  _app/
    route.tsx
    organizations/
      new.tsx
    $orgSlug/
      route.tsx
      onboarding.tsx
      _shell/
        route.tsx
        index.tsx
        settings/
          business.tsx
```

Rules:

- Use `_public`, `_guest`, and `_app` when a route group adds layout, guard, or
  context without changing the URL.
- Do not use parenthesized route group folders.
- Use TanStack `index.tsx` only for index routes. Do not use app barrel files.
- Use route-ignored `-<name>` files or folders only for route-only schemas,
  search-param helpers, or one-off constants that must stay beside the route.
  Do not create route-private page/component slices by default.

## Route Files

Route files may compose UI directly when the file stays readable. Keep route
files under roughly 250 lines; extract to `components/<area>/...` when component
state, forms, tables, or repeated UI makes the route hard to scan.

Typical route responsibilities:

- path params and search validation
- auth and guest redirects
- organization access boundaries
- route `head()` metadata
- React Query `ensureQueryData(...)` or optional `prefetchQuery(...)`
- direct composition of imported components

Do not put reusable component internals, table state, form state, or mutation
policy directly in route files.

## Component Placement

Use domain-first component folders:

```text
components/settings/business-settings-form.tsx
components/members/members-table.tsx
components/app-shell/sidebar.tsx
components/onboarding/onboarding-page.tsx
```

Use flat generic app components for app-wide wrappers and primitives:

```text
components/form-fields.tsx
components/logo.tsx
components/theme-switcher.tsx
```

Do not create `components/shared`, `components/ui`, `components/forms`,
`components/tables`, `components/navigation`, or other type buckets. If a table
belongs to members, it lives under `components/members`. If a form belongs to
settings, it lives under `components/settings`.

## React Query Preloading

React Query owns server-data caching. `defaultPreloadStaleTime: 0` is
intentional so router preload events delegate freshness to React Query.

Use `ensureQueryData(...)` in `beforeLoad` when the route needs data before
rendering, redirecting, or building route context:

```ts
await context.queryClient.ensureQueryData(
  orpc.organizations.settings.get.queryOptions({
    input: { orgSlug: params.orgSlug }
  })
);
```

Use `prefetchQuery(...)` only to warm optional data that should not block route
entry:

```ts
void context.queryClient.prefetchQuery(
  orpc.organizations.settings.get.queryOptions({
    input: { orgSlug: params.orgSlug }
  })
);
```

Do not copy Midday's Next.js `prefetch(...)` server helper wholesale. Midday
needs a request-scoped React server query client and fire-and-forget server
component prefetching. TanStack Start already gives routes
`context.queryClient`, and `@tanstack/react-router-ssr-query` handles
dehydration.

Add a local prefetch helper only after repeated route code needs it, for example
batch prefetching or shared infinite-query handling. Until then, call
`context.queryClient.ensureQueryData(...)` or
`context.queryClient.prefetchQuery(...)` directly in the route.

## Hooks And Query Options

Route preloading may inline `orpc.<router>.<procedure>.queryOptions(...)`.
Component hooks may also inline the same `queryOptions(...)` call. Do not create
`getXQueryOptions(...)` factories by default.

Create a query option factory only when it carries real shared policy such as
custom stale time, result selection, input normalization, or reuse across three
or more call sites. See [API fetching patterns](./api-fetching-patterns.md).

## Auth And Organization Routes

Use `_app/route.tsx` as the protected app boundary.

- Fetch authenticated user and organization membership in `beforeLoad`.
- Redirect unauthenticated users before rendering protected UI.
- Redirect users without organizations to the organization setup flow.
- Return only stable data in route context, such as `user` and `organizations`.
- Do not duplicate the same auth redirect in client `useEffect`.

Use `_app/$orgSlug/route.tsx` as the organization access boundary.

- Verify `params.orgSlug` belongs to the authenticated user's organization list.
- Show not found when slug access fails. Do not silently swap organizations.
- Reserve locale codes and top-level static route names so bare organization
  URLs do not collide with public, guest, setup, or infrastructure routes.
- Do not pass an `activeOrganization` object through route context unless
  children need server-derived data that cannot be read from params or queries.
- UI that only needs the current slug should read it with `Route.useParams()`
  or `useParams({ strict: false })`.

For Linear-style entry, `/` redirects authenticated users to `/$orgSlug` for
the active organization dashboard or `/$orgSlug/onboarding` when setup is not
complete. Keep `/home` as the explicit public home page route for signed-in
users. Do not keep a separate `/$orgSlug/dashboard` route when `/$orgSlug` is
the dashboard.

Onboarding progression uses named URL search state, not component-local wizard
state or server persistence. Validate step keys in the route file and keep step
constants near the onboarding component or in `utils/` when shared.

## Gotchas

- `defaultPreloadStaleTime: 0` is deliberate.
- Caching lives in React Query, not the router cache.
- Route files compose, guard, preload, and delegate.
- App code imports exact files; no app barrels.
- `_` pathless route groups add layout or guard without URL segments.
- `-` route-ignored files are for route-only helpers, not default UI slices.

## TanStack Docs Lookup

Use `rtk vp run tanstack -- ...` from the workspace root when current TanStack
behavior or API syntax needs confirmation. Pass `--json` on commands that
support it.

```bash
rtk vp run tanstack -- libraries --json
rtk vp run tanstack -- doc router framework/react/guide/data-loading --json
rtk vp run tanstack -- doc query framework/react/overview --docs-version v5 --json
rtk vp run tanstack -- search-docs "pathless layout routes file based routing"
rtk vp run tanstack -- search-docs "loaders router react"
```
