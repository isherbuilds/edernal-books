# Backend Architecture

Use this when changing backend package shape, middleware, request context, public API surfaces, external callbacks, caching, or cross-package abstractions.

This repo uses Hono + oRPC + Better Auth + Drizzle. Copy production composition ideas from Midday only when they fit this stack; do not copy Supabase, tRPC, replica, or worker assumptions before this repo needs them.

Related docs:

- [oRPC patterns](./orpc.md) for procedure factories, routers, typed errors, and request-scoped logging.
- [Core package patterns](./core.md) for shared schemas, enums, defaults, and formatters.
- [Auth patterns](./auth.md) for Better Auth, protected route bootstrap, and organization state.
- [Logging](./logging.md) only when changing durable logs.
- [Environment variables](./environment-variables.md) when adding runtime config.

## Goals

- Keep API handlers as transport orchestration, not domain dumping grounds.
- Keep request identity, auth, org scope, logging, and errors consistent across server entry points.
- Extract only when reuse, external integration complexity, or independent testability makes a boundary real.
- Prefer named domain modules over broad `utils`, `common`, or `shared` folders.
- Inline first for obvious one-consumer logic; see Extraction Timing for
  extraction thresholds.

## Package Roles

### `apps/server`

Runtime shell. Owns Hono app creation, CORS, request logger middleware, Better Auth mounting, log ingestion, oRPC/OpenAPI handlers, global Hono error handling, and process startup.

Mount Hono-only routes here when they need raw request access, signature verification, file streaming, redirects, or custom response behavior. Do not put domain business logic here.

### `packages/api`

Transport contract layer. Owns oRPC routers, procedure factories, request context, typed procedure errors, and API-local orchestration.

Use `packages/core` schemas for shared transport contracts. Call `packages/db/src/queries` when DB logic is reused, transactional, subtle, or not trivial.

### `packages/db`

Persistence layer. Owns Drizzle schema, relations, DB client, migrations, DB-local errors, and reusable query functions.

Query functions accept `db` or `tx` first, then one input object. Every org-owned query requires verified `organizationId`.

### `packages/core`

Runtime-agnostic shared contracts. Owns pure schemas, enums, defaults, formatters, normalizers, and option builders consumed by more than one package. No DB, env, logger, network, React, Hono, or oRPC dependencies.

### Domain Packages

Create packages like `packages/banking`, `packages/import`, or `packages/invoice` only when the boundary is useful outside one API router.

Good triggers:

- provider SDK or external API adapters,
- logic shared by API and jobs/workers,
- independent retries, provider error normalization, rate limits, or tests,
- domain surface large enough that `packages/api` hides intent.

Bad triggers:

- one helper used once,
- a folder feels large but has no independent boundary,
- generic code without a domain name.

## API Surface

Use oRPC for internal app APIs.

- Add procedures under `packages/api/src/routers/<slice>/index.ts`.
- Use `publicProcedure` and `protectedProcedure` from `packages/api/src/lib/procedures/factory.ts`.
- Define explicit input, output, and typed errors.
- Keep TanStack Query wrappers in `apps/web/src/hooks`; do not add frontend
  `api/` folders.

Use Hono/OpenAPI only for stable external callers, SDK generation, webhooks, OAuth callbacks, file streaming, or provider-specific HTTP semantics.

Default external route shape:

```text
packages/api/src/external/<slice>/
  index.ts
  schemas.ts
  verify.ts
  handler.ts
```

Small infrastructure routes such as `/health`, `/auth/*`, `/_logs/ingest`, `/docs`, and redirects can live directly in `apps/server`.

## Router And Middleware Rules

- `routers/index.ts` only composes routers and exports router types.
- Use simple procedure names: `list`, `byId`, `create`, `update`, `remove`, `search`.
- Keep handler flow linear: validate input, read context, call query/service, map output, return.
- Do not wrap handlers in broad `try/catch` or log-and-rethrow blocks. Use typed
  errors for expected failures and shared error handling for unexpected ones.
- Auth belongs in procedure middleware, not repeated in handlers.
- Org/member/role checks become named middleware once reused.
- Request-scoped logging comes from `context.logger`; handlers should not create standalone request loggers.
- Do not rely on mount order as the only public/protected safety mechanism.

Global Hono middleware order:

1. CORS and security headers.
2. Request logger/request id middleware.
3. Infrastructure public routes.
4. Public external routes that need raw request access.
5. One oRPC/OpenAPI dispatcher.
6. Global `app.onError`.

## Request Identity And Tenant Scope

Every backend entry point needs one correlation id.

- Use incoming `x-request-id` when present.
- Else use a trusted platform trace header when present.
- Else create `crypto.randomUUID()`.

Propagate `requestId` into API context, logs, public error envelopes, outbound provider calls, audit rows, outbox events, and jobs when they originate from a request. Never use it as auth, idempotency, or business identity.

Use Better Auth as identity source. Use org/member context for tenant scope.

- Request context carries Better Auth `authSession` as `AuthSession | null`.
- Auth-only routes use `protectedProcedure`; tenant routes use org-scoping middleware/procedure.
- Client-facing org-scoped inputs use `orgSlug`.
- Middleware verifies slug membership and adds canonical `organizationId`.
- DB query inputs include `organizationId` explicitly for org-owned data.
- Never trust tenant scope from client input without membership verification.

## DB Query Layer

Promote persistence logic into `packages/db/src/queries/<domain>.ts` when it is reused, transactional, joins multiple tables, writes audit/outbox/idempotency data, or has subtle org scoping.

Rules:

- Pass `db` or `tx` first so callers can run transactions.
- Pass one typed input object second.
- Require `organizationId` for org-owned queries.
- Return DB records or clearly named projections; transport mapping stays in API unless shared.
- Keep audit/outbox/idempotency writes in the same transaction as the business write.
- Avoid importing the `db` singleton inside query functions.

## External Routes And Webhooks

External routes are not normal app procedures.

- Mount before the oRPC/OpenAPI catch-all.
- Verify signatures before parsing into domain commands when raw body matters.
- Use constant-time comparison for signatures, tokens, state, and secrets.
- Do not trust `x-forwarded-for` unless the deployment has a known trusted proxy chain.
- Store idempotency records before side effects.
- Respond quickly after durable persistence; add outbox/jobs only when slow follow-up work needs retry.
- Normalize provider payloads into internal command objects before touching DB.
- Returning `2xx` acknowledges provider events; returning `5xx` asks for retry.

## Cache, Jobs, And Health

Do not add Redis, replicas, or worker packages by default.

- Add cache only for measured cost, external rate limits, or repeated cross-request reads.
- Keep auth, org data, finance data, and mutations `Cache-Control: no-store` by default.
- Add outbox before a worker package when durable async intent or retry is needed after DB commit.
- Add worker/client packages only after a real separate worker runtime exists and at least two producers need the same enqueue/status API.
- Health checks stay cheap: `/health/live` has no dependencies; `/health/ready` checks tier-1 dependencies with short timeouts.

## Extraction Timing

- Inline first when there is one consumer and behavior is obvious.
- Extract to slice-local helper when one router repeats a step or handler depth becomes hard to scan.
- Extract to `packages/api/src/lib` for transport infrastructure, context, middleware, or error plumbing used by multiple routers.
- Extract to `packages/db/src/queries` for reused or correctness-sensitive DB behavior.
- Extract to `packages/core` for shared schemas, enums, defaults, formatters, or option lists.
- Extract to a new package for provider adapters, SDK clients, independent tests, or runtime boundaries.

Avoid package cycles. If two packages want each other's constants, event names, schemas, or metadata, move the neutral contract into `packages/core`.

## Naming

- `orgSlug`: user-facing route/API input.
- `organizationId`: verified DB tenant boundary.
- `requestId`: per-request correlation only.
- `idempotencyKey`: deduping commands/events.
- `providerEventId`: external webhook dedupe.
- `snapshot`: immutable point-in-time copy.
- `handler.ts`: external route action.
- `verify.ts`: signatures, state, and secret checks.
