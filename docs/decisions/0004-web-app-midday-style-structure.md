# ADR-0004: Web App Midday-Style Structure

## Status

Accepted

## Date

2026-06-21

## Context

The web app had UI split across `routes`, `pages`, `features`, `widgets`, and
`shared`. That made ownership hard to read: the main route lived in one place,
page composition in another, feature UI elsewhere, and app-wide wrappers under a
large `shared` bucket.

Midday's dashboard app uses a flatter, more direct structure. Representative
patterns:

- route files preload required data and return a component;
- app UI lives under `components`;
- React hooks live under `hooks`;
- pure helpers live under `utils`;
- app services live under `lib`;
- providers and styles are top-level app folders;
- route composition stays easy to scan without FSD layer jumping.

The target here is not to copy Midday's Next.js mechanics. This repo uses
TanStack Start, TanStack Router, React Query, oRPC, and Vite Plus. The useful
part is the ownership model: route, component, hook, utility, and provider names
should reveal where to look.

## Decision

Use this app-local structure under `apps/web/src`:

```text
routes/
components/
hooks/
utils/
lib/
providers/
styles/
config/
```

Remove the frontend FSD folders: `features`, `pages`, `widgets`, `entities`, and
`shared`.

Use TanStack `_` pathless route groups:

```text
routes/{-$locale}/_public
routes/{-$locale}/_guest
routes/{-$locale}/_app
```

Do not use parenthesized route group folders.

Route files may compose UI directly when they stay readable and should usually
remain under 250 lines. Move stateful forms, tables, modals, repeated sections,
and cross-route UI to `components/<area>/...`.

Component placement is domain-first:

```text
components/settings/business-settings-form.tsx
components/members/members-table.tsx
components/app-shell/sidebar.tsx
```

Generic app components stay flat:

```text
components/form-fields.tsx
components/logo.tsx
components/theme-switcher.tsx
```

Generic app-agnostic primitives, such as `Container`, live in `packages/ui`.

Do not create `components/shared`, `components/ui`, `components/forms`,
`components/tables`, `components/navigation`, or other type buckets.

Do not create frontend `api/` folders. TanStack Query and oRPC code lives in
route `beforeLoad` for simple preloading, or in `hooks/` when a hook owns
mutation invalidation, query policy, result mapping, or component readability.

Do not create `getXQueryOptions(...)` factories by default. Route files may
inline `orpc.<router>.<procedure>.queryOptions(...)`; component hooks may inline
the same call. Extract a query option factory only when shared non-trivial
policy or repeated use makes the factory pay for itself.

Do not copy Midday's Next.js `prefetch(...)` server helper wholesale. TanStack
Start routes already receive `context.queryClient`, and
`@tanstack/react-router-ssr-query` owns dehydration. Use
`context.queryClient.ensureQueryData(...)` for route-required data and
`context.queryClient.prefetchQuery(...)` for optional warmups.

App code imports exact files. No app barrel files except TanStack route
`index.tsx` files and package public entrypoints outside `apps/web`.

## Alternatives Considered

### Keep FSD Layers

Rejected. FSD layering made simple screens harder to follow in this app because
route ownership, page composition, feature UI, and shared wrappers were split
across too many directories.

### Route-Owned `-<slice>` UI Folders

Rejected as a default. TanStack ignored folders are still useful for route-only
schemas or one-off route helpers, but page UI should move to `components` once
it needs a name.

### Type Buckets Under `components`

Rejected. `components/forms`, `components/tables`, `components/navigation`, and
`components/shared` recreate the same ownership problem under different names.
The owning domain should be visible in the path.

### Frontend `api/` Layer

Rejected. With oRPC's TanStack Query integration, simple preloads and hooks can
call `queryOptions()` directly. A separate frontend API abstraction would mostly
rename the generated client without adding behavior.

### Copy Midday Prefetch Helper

Rejected for now. Midday's helper solves a Next.js server-component problem.
TanStack Start already supplies a route query client and SSR query integration.
A tiny local helper can be added later if batch prefetching or infinite-query
branching repeats enough to justify it.

## Consequences

- Frontend imports become more literal and easier to grep.
- `features`, `pages`, `widgets`, and `shared` removal requires broad import
  updates and generated route tree refresh.
- Existing FSD lint/tooling assumptions must be removed or rewritten.
- Future UI placement decisions use domain ownership first, not technical type.
- Query code stays close to hooks and routes without a generic frontend API
  layer.
