# UI Guidelines

Use this when adding or refactoring UI in `apps/web` or reusable components in `packages/ui`.

This file is the source of truth for app UI composition, extraction decisions, and shared component boundaries. For route/file placement, follow [TanStack patterns](./tanstack-patterns.md). For complex client-owned state shared across components, follow [Zustand state management](./zustand.md).

## Goals

- Prefer existing primitives from `@tsu-stack/ui` before creating new app-local ones.
- Keep `packages/ui` reusable and app-agnostic.
- Keep app UI in `apps/web/src/components`, with route files composing imported
  components directly when the route stays readable.
- Extract shared UI only when reuse and app-agnostic boundaries are real.
- Keep one-screen UI direct. Do not introduce providers, compound components,
  render props, context, stores, or wrapper components for a single call site.

## Default Sources

- Prefer existing components from `@tsu-stack/ui/components/*` before creating new app-local primitives.
- Prefer app wrappers from `apps/web/src/components` when the app already owns routing, image, locale, or other app-specific integration details.
- Use `lucide-react` for icons unless an existing asset or brand graphic is the better fit.
- Use `@tsu-stack/ui/lib/utils` `cn(...)` for class composition.

## App Composition

- Build app screens from route files plus `components/<area>/...`.
- Use domain-first component folders such as `components/settings` or
  `components/members`.
- Use flat generic app components such as `components/form-fields.tsx` and
  `components/logo.tsx`.
- Do not create `components/shared`, `components/ui`, `components/forms`,
  `components/tables`, or other type buckets.
- Prefer composing `@tsu-stack/ui` primitives instead of duplicating styling across many leaf components.
- Keep route files under roughly 250 lines. Route files may compose UI directly,
  but table state, form state, modal state, and repeated UI move into
  `components/<area>/...`.
- The app uses React Compiler. For new UI code, prefer plain local functions and derived values; add `useMemo`, `useCallback`, or `memo` only when a dependency boundary, third-party API, or measured hotspot requires manual control.
- Prefer direct JSX and local handlers for one-off UI. Extract subcomponents only
  when repeated, independently meaningful, or needed to keep the route/component
  readable.

## Extraction Rule

- Extract a component to `packages/ui` when it is reusable, app-agnostic, and the shared package can own its styling and accessibility.
- Keep a component app-local when it depends on route params, current locale, auth state, app SEO, app config, or other app-owned integrations.
- If reuse is still speculative, keep the component app-local first and extract after a second real use case.
- If abstraction exists only to rename props or hide a single primitive, inline it.

## Shared Package Boundaries

- `packages/ui` must not import from `apps/*`, TanStack Router, or app env modules.
- Keep semantic HTML, styling, layout, and accessibility inside the shared component.
- Keep CDN, proxy, locale, router, and analytics behavior outside shared UI primitives.
- Provide sensible defaults so shared components still work without injected app-specific dependencies.
- Keep colocated shared UI state near the component family that owns it.

## Dependency Injection

When a shared component needs an app-specific primitive, inject it instead of importing it.

- Navigation: accept `linkComponent?: React.ElementType`, default to `"a"`.
- Media: accept `imageComponent?: React.ElementType`, default to the shared `packages/ui` image primitive or a semantic fallback.
- Future wrappers: apply the same pattern for things like video, avatar, markdown, or analytics-aware buttons.
- Keep injected component props optional and forward the smallest useful prop surface.
- When router links may need either router `to` or plain `href`, support both and let the injected link decide what to use.
- For configurable media, keep related props grouped in a nested object instead of scattering env-specific props across the component API.

## Decision Rule

- Use prop injection when only data or one-off config changes per usage.
- Use component injection when behavior or implementation changes per app.
- Prefer component injection when the same app-specific dependency would otherwise be repeated across many call sites.
- For shared UI state that coordinates sibling components inside `packages/ui`, prefer a small colocated Zustand store over prop drilling or React context only to shuttle simple open/close state. Follow [Zustand state management](./zustand.md) for store shape and selectors.

Reference pattern:

```tsx
type CardProps = {
  linkComponent?: React.ElementType;
  imageComponent?: React.ElementType;
  href: string;
  image?: {
    src: string;
    alt?: string;
    siteBaseUrl?: string;
    imgProxyBaseUrl?: string;
  };
};
```

## shadcn Usage

- The repo uses shadcn with the `base-nova` style, `neutral` base color, `lime` theme, `sky` charts, CSS variables, Inter fonts, and Lucide icons. Theme tokens are based on preset `b5J4sHFTc`; keep Lucide unless explicitly migrating component icons.
- In `apps/web/components.json`, keep shadcn `ui`, `utils`, `lib`, and `hooks`
  aliases pointed at `@tsu-stack/ui`; keep `components` pointed at app
  components for app-level blocks and wrappers.
- Add reusable shadcn-derived components to `packages/ui` when they can stay app-agnostic.
- Keep a component in `apps/web` when it depends directly on app routing, auth, SEO, locale, or app config.
- Keep app-level wrappers and glue code in `apps/web/src/components`.

## Images And Links

- Prefer app-owned wrappers for images or routing-aware links when the app needs locale, router, or env-specific behavior.
- Shared components should accept injected link or image components instead of importing app wrappers directly.
- Keep base URL, CDN, and proxy decisions outside shared primitives.

## Do And Don't

- Do keep `packages/ui` reusable and free of app imports.
- Do keep styling and accessibility inside the shared component.
- Do extract app-specific wrappers into `apps/web/src/components`.
- Don't hardcode router, locale, analytics, or env behavior into `packages/ui`.
- Don't introduce React context or excessive prop drilling for shared UI state when a colocated store is enough.
- Don't expose app-specific implementation details unless reuse requires them.
