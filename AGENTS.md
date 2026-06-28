# Edernal Books / tsu-stack

Owner-first accounting app for India SMBs on TanStack Start + Hono + oRPC + Drizzle + Better Auth + Paraglide.js, powered by Vite Plus.

Use Vite Plus commands in this repo: `vp` for package/scripts, `vpx` for one-off CLIs.

## Coding Defaults

- Keep code simple, direct, and fast. Inline first; extract only when reuse, real policy, independent testing, or readability makes the boundary earn its cost.
- Treat one-off helpers, wrappers, option factories, hooks, providers, contexts, and component abstractions as suspect. Remove or inline them unless they have at least two real call sites or carry non-trivial policy.
- Do not add defensive `try/catch`, fallback defaults, graceful degradation, compatibility redirects, or "just in case" branches to hide uncertainty. Fix root cause or fail loud, especially for auth, tenant scope, money, config, and data integrity.
- Do not bypass TypeScript with `any`, broad casts, non-null assertions, or duplicated local types. Narrow at the source, derive from schemas, or move shared contracts into `packages/core`.
- Prefer fewer layers on hot paths. Avoid extra render state, effects, providers, stores, query wrappers, and memoization unless there is a measured need or a real dependency boundary.
- Use composition patterns only when a reusable component API needs flexibility. For one screen or one call site, prefer plain props, local state, and direct JSX.
- Before handoff, remove AI slop: unnecessary comments, speculative abstraction, unused indirection, broad error handling, and helpers that only rename another call.

Common commands:

- `vp run dev` - start dev servers
- `vp check --fix` - package-local format, lint fixes, and typecheck
- `vp run -w fix` - workspace fix after cross-package/root changes
- `vp run build` - build all packages

## Git Discipline

- Do not commit changes unless the user explicitly says to commit the changes.
- Staging is allowed only when the user asks for it or it is needed for an explicitly requested commit.

Start with the smallest relevant doc set. Open the most specific `.agents/*.md` file first, then follow links only when the task crosses into another concern.

Public orientation starts at [README.md](README.md). Documentation map starts at [docs/README.md](docs/README.md). Architecture map starts at [docs/architecture.md](docs/architecture.md).

## Cross-Cutting

- [Workflow](.agents/workflow.md): fix cadence, validation scope, build checks, migrations, commits.
- [Vite+ toolchain](.agents/vite-plus.md): `vp`/`vpx`, workspace scripts, package management.
- [Testing](.agents/testing.md): focused unit/e2e coverage and test command scope.
- [Choice flows](.agents/choice-flows.md): native approvals, structured input, human decision points.
- [Documentation style guide](docs/documentation-style-guide.md): public docs, package READMEs, architecture docs, ADRs, planning docs.
- [Logging](.agents/logging.md): durable logs, request logging, redaction, client/server logging.

## Task Entry Points

- UI work: [UI guidelines](.agents/ui.md) and [Design system](.agents/design-system.md) (page composition, shared layout/table primitives, read-states, money/visual standards). Add [Form patterns](.agents/forms.md) for forms, validation, field rerenders, or submit behavior. Add [TanStack patterns](.agents/tanstack-patterns.md) for routes/loaders/page composition. Add [Zustand state management](.agents/zustand.md) only for durable client-owned state shared across components.
- Shared client state: prefer local state, props, or component injection first. Use [Zustand state management](.agents/zustand.md) when state is client-owned, durable, and read or updated by different components.
- Bugfix: start with the owning domain doc, then [Workflow](.agents/workflow.md). Add [Testing](.agents/testing.md) for regression coverage and [Core package patterns](.agents/core.md) when shared contracts change.
- Documentation work: start with [Documentation style guide](docs/documentation-style-guide.md). For accounting docs, read [Accounting planning hub](docs/superpowers/README.md).
- Uploads or object storage: [Media storage and uploads](.agents/media-storage.md), plus [Core](.agents/core.md), [oRPC](.agents/orpc.md), and [Environment variables](.agents/environment-variables.md) only when those surfaces change.
- End-to-end feature: [End-to-end feature workflow](.agents/end-to-end-features.md), then the domain docs it links.

## Domain Docs

- [Design system](.agents/design-system.md): page composition, shared layout/table primitives (`PageLayout`, `PageHeader`, `DataTable`, `QueryState`), read-states, money rendering, theme tokens.
- [TanStack patterns](.agents/tanstack-patterns.md): route structure, `beforeLoad`, layouts, route-level preloading, TanStack docs lookup.
- [API fetching patterns](.agents/api-fetching-patterns.md): slice-local TanStack Query and oRPC client wrappers in `apps/web`.
- [Form patterns](.agents/forms.md): React Hook Form, Zod v4, mutation submit behavior, accounting form shape.
- [oRPC patterns](.agents/orpc.md): server procedures, router shape, typed errors, request-scoped handler logging.
- [Auth patterns](.agents/auth.md): Better Auth architecture, auth query behavior, protected/guest route rules.
- [i18n guidelines](.agents/i18n.md): copy keys, locale file policy, Paraglide codegen, hydration gotchas.
- [SEO patterns](.agents/seo.md): route `head()` usage and `@tsu-stack/seo`.
- [Core package patterns](.agents/core.md): shared domain contracts in `packages/core`.
- [Backend architecture](.agents/backend-architecture.md): package boundaries, API runtime, middleware, request identity, cache, health.
- [TypeScript conventions](.agents/typescript.md): schema placement, import boundaries, `lib/` vs `utils/`.
- [Environment variables](.agents/environment-variables.md): env scoping, validation, Docker propagation.

<!-- intent-skills:start -->

## Skill Loading

- Use skills already listed in context when they clearly cover the task.
- Run `rtk vpx @tanstack/intent@latest list` only when relevant local package guidance may exist but is not already visible, or when the task spans unfamiliar packages.
- Load the most specific matching skill with `rtk vpx @tanstack/intent@latest load <package>#<skill>`; load more only when the task truly spans multiple concerns.

<!-- intent-skills:end -->
