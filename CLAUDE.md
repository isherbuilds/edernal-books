# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Edernal Books — an owner-first accounting app for India SMBs, built on the `tsu-stack`
TypeScript monorepo. Stack: TanStack Start (web) + Hono (API server) + oRPC (typed
procedures) + Drizzle/Postgres + Better Auth + Paraglide.js (i18n), managed by **Vite Plus**.

## Tooling: Vite Plus replaces pnpm/npm/yarn

`vp` is the only CLI for this repo (it wraps pnpm for package management and bundles
Oxlint, Oxfmt, Vitest, and staging hooks). Use `vpx` for one-off CLIs. **Never invoke
pnpm/npm/yarn/npx directly.**

| Instead of                              | Use                              |
| --------------------------------------- | -------------------------------- |
| `pnpm <script>` / `pnpm run`            | `vp run <script>`                |
| `pnpm --filter <pkg> <script>`          | `vp run --filter <pkg> <script>` |
| `pnpm run -w <script>` (workspace root) | `vp run -w <script>`             |
| `pnpm add <dep>`                        | `vp add <dep>`                   |
| `npx <pkg>`                             | `vpx <pkg>`                      |

`vp run -r <script>` runs a script recursively across all packages.

## Common commands

| Command                | Purpose                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `vp run dev`           | Start all dev servers (web on :3000 `/web`, server on :5000 `/server`)              |
| `vp run build`         | Build all packages/apps                                                             |
| `vp check --fix`       | **Package-local** format + lint + typecheck (run from the changed package)          |
| `vp run -w fix`        | **Workspace-wide** format + lint + typecheck (cross-package/root/generated changes) |
| `vp run test:unit:run` | Run unit tests                                                                      |
| `vp run test:e2e:run`  | Run e2e tests                                                                       |

### Validation scope (important)

`vp check --fix` and `vp run -w fix` format (Oxfmt), lint (Oxlint), and typecheck in one
pass. Run the **narrowest** command that covers the touched surface: package-local
`vp check --fix` for scoped changes; `vp run -w fix` only for cross-package, root config, or
generated-artifact changes. For larger planned work, run fixes after milestones rather than
after every edit. See `.agents/workflow.md`.

### Database (Drizzle + Postgres)

Schema lives in `packages/db/src/schema/`. Migration flow:

1. Edit schema in `packages/db/src/schema/`
2. `vp run db:generate` — create migration files
3. **Verify `DATABASE_URL` points to localhost/127.0.0.1.** If it looks like production, stop and warn the user.
4. `vp run db:migrate` — apply. **Features silently fail without applied migrations.**

Helpers: `vp run db:dev:start` / `db:dev:stop` (local Postgres via Docker), `vp run db:studio` (Drizzle Studio).

### Testing

Unit tests live in `src/**/__tests__/*.test.ts`; e2e tests in `__e2e__/**/*.spec.ts`.
Prefer package-local test commands when they cover the touched surface. Vitest config goes
**inside** `vite.config.ts` (Vite+ conventions) — do **not** create `vitest.config.ts`. See
`.agents/testing.md`.

## Architecture

Runtime apps stay thin; logic lives in pure, typed packages.

```text
apps/web        TanStack Start web app — routes, loaders, page composition
apps/server     Hono API server — startup, CORS, auth mount, request logging
packages/api    oRPC routers, context, procedure factories, isomorphic client (transport contracts, NOT DB-heavy logic)
packages/core   runtime-agnostic shared contracts + pure helpers (NO db/env/logger/React/Hono/oRPC)
packages/db     Drizzle schema, migrations, DB client, query/transaction helpers
packages/auth   Better Auth config + React/TanStack auth helpers
packages/env    validated runtime env (defined in packages/env/src, documented in its README)
packages/i18n   Paraglide messages, runtime, Vite plugin, localized routing
packages/logger evlog client/server/request logging facade (all logging goes through this)
packages/seo    TanStack Start route head helpers
packages/ui     app-agnostic UI primitives (must NOT import router/locale/auth/env/analytics)
```

Dependency direction: apps → packages; `api → {auth, core, db, env, logger}`; `core` depends
on nothing runtime-specific. See `docs/architecture.md` for the full package graph and request flows.

### Server request flow

Requests hit `apps/server` Hono under `/server`: CORS → request logger → branch by path
(`/auth/*` to Better Auth, `/rpc/*` & `/docs/*` to the oRPC handler via `createContext`).
oRPC procedures read the session, check membership, and run organization-scoped DB writes.

## Coding defaults

- Keep code simple, direct, fast. Inline first; extract only for real reuse, shared policy, independent testing, or a genuine package/runtime boundary. Treat one-off helpers, wrappers, option factories, and thin component abstractions as suspect.
- **No defensive `try/catch`, fallback defaults, graceful degradation, or "just in case" branches** to hide uncertainty — fix root cause or fail loud, especially for auth, tenant scope, money, config, and data integrity.
- **No `any`, broad casts, or non-null assertions.** Narrow at the source, derive from schemas, or move shared contracts into `packages/core`.
- Before handoff, do a simplicity pass: remove speculative abstraction, unused indirection, broad error handling, and unnecessary comments.

## Accounting invariants (non-negotiable)

For accounting work read `docs/superpowers/README.md` first. Core rules:

- Better Auth `organization` is the business tenant; **UI says "Business", not "organization"**.
- **Money uses integer minor units.**
- **Posted journal entries are immutable** — corrections use reversals + new postings.
- Sensitive mutations write `audit_event` (in the same transaction).
- Async side effects start from `outbox_event`.
- Replay protection uses operation-local idempotency (natural keys, domain command keys, provider ids, or domain-owned unique constraints) — `requestId` is observability only, **not** a dedupe key.
- `rls-inventory` = security checklist, not stock inventory.

## Where to find detailed guidance

`AGENTS.md` routes to task-specific docs in `.agents/`. Open the most specific doc first:
`workflow.md`, `testing.md`, `vite-plus.md`, `ui.md`, `design-system.md`, `forms.md`, `tanstack-patterns.md`,
`api-fetching-patterns.md`, `orpc.md`, `auth.md`, `i18n.md`, `core.md`,
`backend-architecture.md`, `typescript.md`, `logging.md`, `media-storage.md`,
`environment-variables.md`, `zustand.md`. Architecture map: `docs/architecture.md`.

Commits use Conventional Commit format; run the appropriate fix command before staging.
