# Zustand State Management

Use this when adding or refactoring durable client-owned state that is read or updated by different components in `apps/web` or reusable UI packages.

For server data, route preloading, and mutations, follow [API fetching patterns](./api-fetching-patterns.md) and [TanStack patterns](./tanstack-patterns.md). Zustand is for client-owned state: UI coordination, local preferences, local drafts, local-first workflows, and reusable component-family state.

## Default Rule

- Prefer local component state when one component owns the state.
- Prefer props or component injection for simple parent-to-child configuration.
- Use Zustand when state is client-owned, durable enough to justify a store, and shared across different components or component families.
- Do not use Zustand as a server cache. Use TanStack Query and route `beforeLoad` preloading for server data.
- Do not introduce React Context just to pass mutable state/actions around.
- Keep existing context providers when they provide stable dependencies or integration contracts such as theming, routing, logging, framework glue, or third-party provider APIs.

## Dependency

When adding the first Zustand store to a package, declare `zustand` as a dependency. Follow [Vite+ toolchain](./vite-plus.md).

## Placement

Follow the Midday-style web structure from [TanStack patterns](./tanstack-patterns.md).

```text
components/example/
  filters-panel.tsx
hooks/
  use-filter-state.ts
stores/
  filters.store.ts
```

Use the layer that owns the behavior:

- `apps/web/src/stores/` only when a store is app-wide client state with a real
  owner and multiple consumers.
- Area-specific stores should use domain names and stay paired with the owning
  components/hooks by import direction, not by FSD layer.
- `packages/ui` component folders may keep colocated stores for reusable component-family state.

Do not create `stores.ts` or a global store without an app-wide ownership reason.

## Naming And Shape

- Stores use `*.store.ts`.
- Slice creators use `*.slice.ts` only when composing a deliberately shared store.
- Hook wrappers use `use-*.hook.ts`.
- Keep state fields first, then actions.
- Use plain action names: `setX`, `open`, `close`, `toggleX`, `resetX`, `initX`.
- When an action needs multiple inputs, use one params object.
- Keep state transitions inside store actions, not scattered through components.
- Keep updates immutable. Copy arrays, records, objects, Sets, and Maps instead of mutating in place.

## Selectors And Hooks

- Export React-facing hook wrappers from `apps/web/src/hooks`.
- Use direct selectors for single values.
- Use `useShallow` when returning an object, array, or computed selector result.
- Avoid `useStore()` unless the component truly needs every field.
- Keep cheap derived values in hook wrappers.
- Store derived state only when it is expensive, shared outside React, or intentionally cached by the store.

## Async Actions

Async actions are fine when the workflow is client-owned and the store owns the state transition.

- Keep I/O details in `lib/` services.
- Use hook wrappers when coordinating router state, session state, server mutations, query invalidation, or effects.
- Do not call server mutations directly from many unrelated store actions.

## TanStack And SSR

TanStack Router `beforeLoad` and loaders are not React components, so do not call Zustand hooks there.

- Use route context for route dependencies.
- Use React Query option factories with `ensureQueryData(...)` for server data.
- Read or initialize Zustand from React components or hook wrappers after hydration.
- If a store change affects route guards or router context, call `router.invalidate()` from React code after the state change.
- In SSR-capable code, never put request-specific secrets, sessions, or authenticated server data in a module-level store.
- Guard browser APIs from server execution.

## Persisted Stores

Use `persist` only for durable client state such as preferences or local drafts.

- Define a storage key constant.
- Add `version`, `migrate`, and `partialize` when the stored shape may evolve or only some fields are durable.
- Do not persist loading flags, modal state, request-scoped data, auth secrets, or server cache data.

## Slice Composition

Most stores should be isolated to the owning app area and exposed through a
small hook.

Use slice creators and a composed global local-data store only when:

- the user explicitly asks for a shared global local-data store,
- the app needs to export, import, reset, or persist multiple local-data domains at once,
- or local-data domains need coordinated actions or cross-slice reads.

Keep business slice creators in their owning app area. Put only the app-wide
composition shell in `apps/web/src/stores/` when composition is necessary.

## Anti-Patterns

- Creating a store because two sibling components can use props.
- Putting business state in a generic shared/common folder when a named app area owns it.
- Calling Zustand hooks in route `beforeLoad`, loaders, server functions, or non-React utilities.
- Subscribing to the whole store from large components.
- Mutating collections in place.
- Persisting transient UI or server-owned data.
- Adding middleware without a concrete need.
