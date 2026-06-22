# Documentation

This directory is the canonical documentation hub for the Edernal Books
monorepo. Root-level docs explain how to run and navigate the repository.
Package-level READMEs explain local ownership. ADRs explain why durable
decisions exist.

## Start Here

| Need                          | Read                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run the repo                  | [../README.md](../README.md)                                                                                                                             |
| Deploy the repo               | [deployment.md](deployment.md)                                                                                                                           |
| Understand architecture       | [architecture.md](architecture.md)                                                                                                                       |
| Understand accounting app performance architecture | [accounting-application-architecture-playbook.md](accounting-application-architecture-playbook.md)                                      |
| Understand accounting roadmap | [superpowers/specs/2026-06-16-ai-native-accounting-foundation-design.md](superpowers/specs/2026-06-16-ai-native-accounting-foundation-design.md)         |
| Execute accounting work       | [superpowers/plans/2026-06-16-plan-set-index.md](superpowers/plans/2026-06-16-plan-set-index.md)                                                         |
| Understand schema vocabulary  | [superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md](superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md) |
| Understand agent routing      | [../AGENTS.md](../AGENTS.md)                                                                                                                             |
| Keep docs consistent          | [documentation-style-guide.md](documentation-style-guide.md)                                                                                             |

## Architecture Docs

- [architecture.md](architecture.md) - current repo architecture, package
  boundaries, runtime flows, and future accounting direction.
- [deployment.md](deployment.md) - Docker/Coolify deployment, single database
  URL, production migrator, and tenant-isolation expectations.
- [accounting-application-architecture-playbook.md](accounting-application-architecture-playbook.md) -
  TanStack Start SSR policy, cursor pagination, URL state, route-first workflows,
  and reference-backed performance examples.
- [../apps/server/ARCHITECTURE.md](../apps/server/ARCHITECTURE.md) - Hono
  runtime composition, middleware order, auth, docs, and handlers.
- [../packages/api/ARCHITECTURE.md](../packages/api/ARCHITECTURE.md) - oRPC
  router composition and context/procedure boundaries.
- [../packages/db/ARCHITECTURE.md](../packages/db/ARCHITECTURE.md) - Drizzle,
  migrations, auth tables, app-enforced tenancy, and accounting schema
  direction.
- [../packages/logger/ARCHITECTURE.md](../packages/logger/ARCHITECTURE.md) -
  evlog client/server/request logger flow.

## Package Docs

| Package                | Docs                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `@tsu-stack/web`       | [../apps/web/README.md](../apps/web/README.md)               |
| `@tsu-stack/server`    | [../apps/server/README.md](../apps/server/README.md)         |
| `@tsu-stack/api`       | [../packages/api/README.md](../packages/api/README.md)       |
| `@tsu-stack/auth`      | [../packages/auth/README.md](../packages/auth/README.md)     |
| `@tsu-stack/core`      | [../packages/core/README.md](../packages/core/README.md)     |
| `@tsu-stack/db`        | [../packages/db/README.md](../packages/db/README.md)         |
| `@tsu-stack/env`       | [../packages/env/README.md](../packages/env/README.md)       |
| `@tsu-stack/i18n`      | [../packages/i18n/README.md](../packages/i18n/README.md)     |
| `@tsu-stack/logger`    | [../packages/logger/README.md](../packages/logger/README.md) |
| `@tsu-stack/seo`       | [../packages/seo/README.md](../packages/seo/README.md)       |
| `@tsu-stack/ui`        | [../packages/ui/README.md](../packages/ui/README.md)         |
| `@tsu-stack/tsconfig`  | [../tools/tsconfig/README.md](../tools/tsconfig/README.md)   |
| `@tsu-stack/vite-plus` | [../tools/vite-plus/README.md](../tools/vite-plus/README.md) |

## Decision Records

- [ADR-0001: Accounting Foundation Spine](decisions/0001-accounting-foundation-spine.md)
- [ADR-0002: Defer PostgreSQL RLS for MVP](decisions/0002-defer-postgresql-rls-for-mvp.md)
- [ADR-0003: Organization Context And Permission Cache Pattern](decisions/0003-organization-context-and-permission-cache-pattern.md)
- [ADR-0004: Web App Midday-Style Structure](decisions/0004-web-app-midday-style-structure.md)
- [ADR-0005: TanStack Start Hybrid SSR Performance Architecture](decisions/0005-tanstack-start-hybrid-ssr-performance.md)

Add a new ADR when a decision changes package boundaries, persistence shape,
auth strategy, public APIs, runtime deployment, accounting invariants, or any
choice that would be expensive to reverse.

## Accounting Planning

Planning docs live under [superpowers](superpowers). They are intentionally more
prescriptive than normal docs because they are execution material for agents.

Core documents:

- [Foundation design spec](superpowers/specs/2026-06-16-ai-native-accounting-foundation-design.md)
- [Plan set index](superpowers/plans/2026-06-16-plan-set-index.md)
- [Phase 0 platform foundation](superpowers/plans/2026-06-16-phase-00-platform-foundation-implementation-plan.md)
- [Phase 1 accounting kernel](superpowers/plans/2026-06-16-phase-01-accounting-kernel-implementation-plan.md)
- [Phases 02-10 roadmap](superpowers/plans/2026-06-16-phases-02-10-roadmap-plans.md)
- [Schema revision source of truth](superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md)

## Maintenance Rules

- Keep one owner per fact. Link instead of copying.
- Package-local behavior belongs in the package README.
- Repo-wide behavior belongs in root README, this docs index, or `.agents`.
- Durable rationale belongs in an ADR.
- Accounting vocabulary belongs in the plan-set index or schema revision.
- If docs mention env vars, verify against [../packages/env/src](../packages/env/src).
- If docs mention public exports, verify against the owning `package.json`.
