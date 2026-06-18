# Edernal Books Project

Edernal Books is an owner-first accounting app for India SMBs, built on the
existing `tsu-stack` TypeScript monorepo.

## Start Here

- Root orientation: [../README.md](../README.md)
- Documentation index: [../docs/README.md](../docs/README.md)
- Architecture: [../docs/architecture.md](../docs/architecture.md)
- Agent routing: [../AGENTS.md](../AGENTS.md)
- Documentation style: [../docs/documentation-style-guide.md](../docs/documentation-style-guide.md)

## Tech Stack

| Package        | Role                                                    |
| -------------- | ------------------------------------------------------- |
| TanStack Start | Full-stack React framework (SSR/SPA/ISR) via Nitro      |
| Hono           | Node API runtime                                        |
| oRPC           | Typed procedures, client, OpenAPI generation            |
| Drizzle ORM    | Type-safe PostgreSQL schema/query layer                 |
| Better Auth    | Self-hosted auth                                        |
| Paraglide.js   | Compiled i18n                                           |
| shadcn/base UI | Shared component primitives                             |
| evlog          | Structured browser/server logging                       |
| Vite Plus      | Workspace CLI, build, check, format, lint, test tooling |

## Monorepo Structure

```text
apps/web        - TanStack Start web app (port 3000, path /web)
apps/server     - Hono API server (port 5000, path /server)
packages/api    - oRPC routers, context, procedure factories, isomorphic client
packages/auth   - Better Auth config and React/TanStack auth helpers
packages/core   - runtime-agnostic shared contracts and pure helpers
packages/db     - Drizzle schema, DB client, migrations, readiness checks
packages/env    - validated runtime env surfaces
packages/i18n   - Paraglide messages, runtime, Vite plugin, localized routing
packages/logger - evlog client/server facade and request middleware
packages/seo    - TanStack Start route head helpers
packages/ui     - app-agnostic shared UI primitives
tools/tsconfig  - shared TypeScript base config
tools/vite-plus - shared Vite Plus lint helpers
```

## Command Rules

Use `rtk` prefix and Vite Plus commands.

| Command                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| `rtk vp run dev`           | Start all dev servers concurrently            |
| `rtk vp run build`         | Build all packages/apps                       |
| `rtk vp run -w fix`        | Workspace format/lint/typecheck when approved |
| `rtk vp check`             | Package-local check when approved             |
| `rtk vp run db:dev:start`  | Start local PostgreSQL                        |
| `rtk vp run db:dev:stop`   | Stop local PostgreSQL                         |
| `rtk vp run db:migrate`    | Run Drizzle migrations                        |
| `rtk vp run db:generate`   | Generate Drizzle migrations                   |
| `rtk vp run db:studio`     | Open Drizzle Studio                           |
| `rtk vp run auth:secret`   | Generate Better Auth secret                   |
| `rtk vp run auth:generate` | Regenerate Better Auth schema                 |

Validation timing is user-directed. Read
[../.agents/workflow.md](../.agents/workflow.md) before running broad checks.

## Architecture Rules

- Runtime apps stay thin.
- `packages/api` owns transport contracts, not DB-heavy business logic.
- `packages/core` must stay runtime-agnostic.
- `packages/db` owns schema, migrations, and reusable query/transaction helpers.
- `packages/ui` must not import app/router/env/auth behavior.
- Browser/server logging goes through `@tsu-stack/logger`.
- Env vars are validated in `packages/env/src` and documented in
  `packages/env/README.md`.

## Accounting Rules

For accounting work, read
[../docs/superpowers/README.md](../docs/superpowers/README.md) first.

Core invariants:

- Better Auth `organization` is the business tenant.
- UI says "Business", not "organization".
- Money uses integer minor units.
- Posted journal batches are immutable.
- Corrections use reversals and new postings.
- Sensitive mutations write `audit_event`.
- Async side effects start from `outbox_event`.
- Replay protection uses `idempotency_ledger`.
- `rls-inventory` means security checklist, not stock inventory.
