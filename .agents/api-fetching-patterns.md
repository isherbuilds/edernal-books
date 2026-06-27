# API Fetching Patterns

Use this when adding or refactoring TanStack Query code in `apps/web`.

## Goals

- Keep route files obvious when routes preload data.
- Keep query, mutation, invalidation, and UI policy in `hooks/`.
- Avoid top-level `api/`, slice-local `api/`, global query registries, and
  pass-through wrappers that only hide the real oRPC procedure.
- Prefer direct `orpc` query options at the call site until a wrapper carries
  real policy or reuse.
- Treat one-off query/mutation hooks, query key helpers, and option factories as
  code smell. Inline them unless they own invalidation, optimistic behavior,
  enabled/stale policy, input normalization, result mapping, or real reuse.

## Placement

Use `apps/web/src/hooks` for React hooks and TanStack Query hooks:

```text
src/hooks/use-business-settings.ts
src/hooks/use-organizations.ts
src/hooks/use-user.ts
src/hooks/use-zod-form.ts
```

Do not create `apps/web/src/api`. Do not create `api/` folders under routes or
components.

Use `apps/web/src/utils` for pure input defaults, option builders, formatters,
and mappers. Use `apps/web/src/lib` for app services and integration glue.

## Inline First

Inline `orpc` usage when the call has no policy:

```ts
const settingsQuery = useQuery(
  orpc.organizations.settings.get.queryOptions({
    input: { orgSlug }
  })
);
```

Route preloading may inline the same query options:

```ts
await context.queryClient.ensureQueryData(
  orpc.organizations.settings.get.queryOptions({
    input: { orgSlug: params.orgSlug }
  })
);
```

This follows Midday's practical pattern: route files inline `queryOptions()` for
prefetching, while client hooks/components inline `queryOptions()` where they
read.

## Hook Extraction Rule

Create `useXQuery` or `useXMutation` when it improves the component contract or
owns real behavior:

- mutation invalidation, optimistic updates, or shared success/error handling
- explicit stale time, refetch behavior, enabled conditions, or selectors
- input normalization before reaching `orpc`
- result mapping into a UI-facing shape
- repeated usage across components
- readable domain name for a component that should not know the oRPC path

Do not create `getXQueryOptions(...)` by default. Create a query option factory
only when the same non-trivial options are shared across three or more call
sites, or when one shared policy must stay identical between route preloading
and component reads.

## Hook File Shape

Keep a small domain's query, mutation, keys, and result types in one hook file:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const businessSettingsQueryKeys = {
  detail(orgSlug: string) {
    return orpc.organizations.settings.get.key({ input: { orgSlug } });
  }
};

export function useBusinessSettingsQuery(orgSlug: string) {
  return useQuery(
    orpc.organizations.settings.get.queryOptions({
      input: { orgSlug }
    })
  );
}

export function useUpsertBusinessSettingsMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.organizations.settings.upsert.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: businessSettingsQueryKeys.detail(orgSlug)
        });
      }
    })
  );
}

export type BusinessSettingsResult = Awaited<ReturnType<typeof client.organizations.settings.get>>;
```

Split a hook file only when it becomes hard to scan, operations gain separate
owners, or another area needs a narrow import.

## Route Integration

Routes import `orpc` directly for simple preloading:

```ts
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/settings/business")({
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      orpc.organizations.settings.get.queryOptions({
        input: { orgSlug: params.orgSlug }
      })
    );
  },
  component: BusinessSettingsRoute
});
```

Use `ensureQueryData(...)` when route entry needs data. Use `prefetchQuery(...)`
for optional warmups. Do not rely on the router loader cache for server data
that components read through TanStack Query.

## Component Usage

Components use the named hook when one exists:

```ts
const settingsQuery = useBusinessSettingsQuery(orgSlug);
const upsertSettings = useUpsertBusinessSettingsMutation(orgSlug);
```

Use direct `useQuery(orpc...)` inside a component only when the call is local,
one-off, and has no shared policy.

## Anti-Patterns

- `src/api` or slice-local `api/` folders in `apps/web`.
- `getXQueryOptions(...)` for every query by habit.
- Query key helpers that are never used for invalidation or cache reads.
- Hook wrappers that obscure the oRPC procedure without adding naming,
  readability, reuse, or policy.
- Duplicating shared domain literals instead of importing contracts from
  `packages/core`.
