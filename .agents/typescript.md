# TypeScript Conventions

Use this for repo-wide TypeScript structure, import boundaries, and schema placement.

For shared cross-package domain contracts in `packages/core`, follow [Core package patterns](./core.md).

## Type Discipline

- Do not use `any`, broad casts, or non-null assertions to push through type errors. Narrow the value, fix the source type, or derive the type from the owning schema.
- Do not duplicate local unions, DTOs, or defaults when a shared schema/helper exists. Import the contract or move it into `packages/core`.
- Keep types close to the owner until a second real consumer needs them. Avoid global type buckets and speculative shared files.
- Prefer inference for local values. Add explicit annotations only when they improve the public contract or stop confusing inference.

## Shared Schema Pattern

For shared package domains, prefer a small domain module over ad hoc type dumping grounds.

```text
src/<domain>/
	constants.ts
	types.ts
	utils.ts
	index.ts
```

For app-local code, keep schemas next to the owning route-only helper,
component area, hook, utility, or package instead of creating a global type
folder.

## Schema Placement

- Keep schemas close to the owning app area, route helper, or package.
- For package-local schemas, the default pattern is `types/thing.type.ts`.
- For `apps/web`, prefer a named schema file near the owner, for example
  `routes/{-$locale}/_app/$orgSlug/-business-search.ts` for route-only search
  validation or `utils/business-settings-defaults.ts` for pure app defaults.
- When the same schema, enum, or default is consumed across packages, move it into `packages/core` instead of recreating literal unions in `apps/web` or `packages/api`.

Example package-local schema:

```ts
export const ThingSchema = z.object({ ... });
export type Thing = z.infer<typeof ThingSchema>;
```

Both schema (`ThingSchema`) and type (`Thing`) are named exports.

When a schema is shared across package boundaries, export the schema and inferred type from the owning shared module and import that same schema everywhere else.

If the frontend needs labels, options, or defaults for a shared enum, derive them from the shared schema or shared helpers instead of creating a second local union.

## Module Resolution

- `nodenext` module resolution with `allowImportingTsExtensions`
- Cross-package: `@tsu-stack/<package>/<subpath>`
- Intra-package: `#@/` alias

## `lib/` vs `utils/`

| Directory | Contains                                          |
| --------- | ------------------------------------------------- |
| `lib/`    | Business logic, library integrations, API clients |
| `utils/`  | Pure stateless helper functions                   |

In `packages/core`, keep shared schemas in domain `types.ts` files and pure domain helpers in `utils.ts`. Do not move router, DB, or React logic there.

## Linting (Oxlint)

Inline disable syntax:

```ts
// oxlint-disable-next-line no-console
console.log("debug");

// oxlint-disable-line no-console, no-plusplus
console.log(x++);

/* oxlint-disable no-console */
// Disables for rest of file
```

ESLint-style comments (`eslint-disable-*`) also work for compatibility.

## Import Sorting (auto-enforced by Oxfmt)

Order: builtins → external → `@tsu-stack/*` → `@/config` → `@/providers` →
`@/lib` → `@/utils` → `@/hooks` → `@/components` → `@/routes` → relative →
styles
