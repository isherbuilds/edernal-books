# @tsu-stack/tsconfig

Shared TypeScript base configuration for workspace apps and packages.

## Responsibilities

- Provide strict compiler defaults.
- Keep module resolution and JSX settings consistent.
- Reduce per-package `tsconfig.json` duplication.

## Public API / Entrypoints

| Import/Path                              | Purpose                               |
| ---------------------------------------- | ------------------------------------- |
| `@tsu-stack/tsconfig/tsconfig.base.json` | Base config extended by apps/packages |

## Current Defaults

- strict mode enabled;
- `moduleResolution: "Bundler"`;
- `module: "ESNext"`;
- `target: "ES2022"`;
- `jsx: "react-jsx"`;
- `noEmit: true`;
- `allowJs: true`;
- DOM and Node types available.

## Integration Notes

Package `tsconfig.json` files should extend this config and only add local
paths/includes when needed.

## Gotchas

- Keep compiler changes broad only when every package can accept them.
- If a setting is only needed by one app/package, add it locally instead of
  weakening the base.
