# Backend Architecture

Use this when changing backend package shape, middleware, request context, public API surfaces, external callbacks, caching, or cross-package abstractions.

This guide adapts patterns observed in Midday's production codebase while keeping this repo's stack choices: Hono + oRPC + Better Auth + Drizzle. Copy the composition principles, not Midday's Supabase, tRPC, replica, or early worker assumptions.

Reference baseline:

- Midday API bootstrap: `midday-ai/midday/apps/api/src/index.ts`
- Midday REST router/middleware split: `apps/api/src/rest/routers`, `apps/api/src/rest/middleware`
- Midday DB package split: `packages/db/src/client.ts`, `packages/db/src/queries`, `packages/db/src/utils`
- Midday cache/health/logger packages: `packages/cache`, `packages/health`, `packages/logger`

## Goals

- Keep API handlers as transport orchestration, not domain dumping grounds.
- Keep cross-package contracts explicit and easy to import.
- Keep request identity, auth, org scope, logging, and errors consistent across all server entry points.
- Extract only when a boundary is real: reuse, external integration complexity, or independent testability.
- Prefer small domain modules over broad `utils` or `common` folders.

## Package Roles

### `apps/server`

Runtime shell.

- Owns Hono app creation, CORS, request logger middleware, Better Auth route mounting, log ingestion, oRPC/OpenAPI handlers, global Hono error handling, and process startup.
- Mount public Hono-only routes here before the catch-all oRPC/OpenAPI handler when they need raw request access, provider signature verification, file streaming, or custom status/body behavior.
- Do not put domain business logic here. Delegate to `packages/api`, `packages/db`, or domain packages.

### `packages/api`

Transport contract layer.

- Owns oRPC routers, procedure factories, request context creation, typed procedure errors, and API-local orchestration.
- Uses `packages/core` schemas for shared transport contracts.
- Calls `packages/db/src/queries` when DB logic is reused, transactional, or non-trivial.
- May own Hono external route modules when a public route is more than a small mount in `apps/server`.

### `packages/db`

Persistence layer.

- Owns Drizzle schema, relations, DB client, migrations, DB-local errors, and reusable query functions.
- Query functions accept `db` or `tx` first, then one input object containing `orgId`/tenant scope.
- No web, Hono, oRPC, Better Auth UI, or logger-request concepts inside query functions unless explicitly part of audit/outbox metadata.

Preferred future shape:

```text
packages/db/src/
  index.ts
  client.ts
  errors.ts
  schema/
  queries/
    index.ts
    <domain>.ts
  utils/
    <domain>.ts
```

### `packages/core`

Runtime-agnostic shared domain contracts.

- Owns pure schemas, enums, defaults, formatters, normalizers, and option builders consumed by more than one package.
- No DB, env, logger, network, React, Hono, or oRPC dependencies.
- Follow [Core package patterns](./core.md).

### Domain Integration Packages

Create packages like `packages/banking`, `packages/import`, or `packages/invoice` only when the boundary is stable and useful outside one API router.

Good triggers:

- Provider SDK or external API logic needs adapter interfaces.
- Logic is used by both API and jobs/workers.
- Logic has independent tests, retries, provider error normalization, or rate limits.
- Domain has enough surface that keeping it in `packages/api` hides intent.

Bad triggers:

- One helper used once.
- A folder feels large but still has no independent boundary.
- Generic "common" code without a domain name.

Preferred package shape:

```text
packages/<domain>/src/
  index.ts          # public domain API
  types.ts          # schemas/types/error codes when package-local
  provider.ts       # adapter interface or provider factory when needed
  providers/
    <provider>.ts
  utils.ts          # package-local pure helpers only
```

Package export rules:

- Export `"."` and a few intentional subpaths. Do not expose entire internals by wildcard unless provider adapters are explicitly public.
- Tighten broad `"./*"` exports once a package API stabilizes. Public subpaths should be deliberate, documented by `package.json`, and safe for other packages to depend on.
- Cross-package imports must use package public exports, for example `@tsu-stack/core/health`. Do not import another package's `src/*` files directly.
- Every cross-package import must have a matching `package.json` dependency unless it is type-only tooling already covered by workspace policy.
- Keep `index.ts` small: export public types, provider/factory, and stable helpers.
- Use provider adapters when external services share one domain contract but differ in auth, rate limits, payloads, and errors.
- Normalize provider errors into package-owned error codes before returning to API code.
- Keep provider SDK clients and retry/rate-limit behavior inside the domain package.
- Tests belong inside the package when logic can run without Hono/oRPC.

## API Surface Rules

### Internal App API

Use oRPC by default.

- Add procedures under `packages/api/src/routers/<slice>/index.ts`.
- Use `publicProcedure` and `protectedProcedure` from `packages/api/src/lib/procedures/factory.ts`.
- Define explicit input, output, and typed errors.
- Keep TanStack Query wrappers in `apps/web` slice `api/` files per [API fetching patterns](./api-fetching-patterns.md).

### Public REST Or Third-Party API

Use Hono/OpenAPI only when the route must be stable for external callers, SDK generation, webhooks, OAuth callbacks, file streaming, or provider-specific semantics.

Default shape for a non-trivial external route:

```text
packages/api/src/external/<slice>/
  index.ts
  schemas.ts
  verify.ts
  handler.ts
```

- `index.ts` exports the Hono router or route factory.
- `schemas.ts` owns provider request/response schemas when they are not shared with web.
- `verify.ts` owns signatures, callback state, token exchange guards, or safe-compare helpers.
- `handler.ts` turns verified provider input into domain operations.
- Validate public API responses against the declared output schema before returning them when that route is externally consumed or SDK-generated.
- Define a consistent error envelope for the public route group. Do not mix `{ error }`, `{ message }`, raw framework exceptions, and ad hoc provider payloads in the same API surface.

Small one-off route exceptions can live directly in `apps/server` if they are infrastructure routes such as `/health`, `/auth/*`, `/_logs/ingest`, `/docs`, or redirects.

## Router Composition

Use explicit public/protected/external groups.

```text
packages/api/src/routers/
  index.ts
  health/
    index.ts
  <domain>/
    index.ts
    queries.ts      # only if API-local; promote to packages/db when reused
    utils.ts        # only slice-local helpers
```

Rules:

- `routers/index.ts` only composes routers and exports router types.
- Each domain router owns public procedure names and transport behavior.
- Use simple procedure names: `list`, `byId`, `create`, `update`, `remove`, `search`.
- Keep handler flow linear: validate through schema, read context, call query/service, map output, return.
- Promote DB-heavy `queries.ts` into `packages/db/src/queries/<domain>.ts` once a second consumer appears or transaction/scoping logic becomes non-trivial.
- Do not rely on "routes mounted before auth are public" as the only safety mechanism. Prefer explicit `publicRouter`, `protectedRouter`, or route-group auth markers so new routes cannot accidentally bypass auth.

## Middleware Order

Global Hono middleware belongs in `apps/server` and should stay boring.

Recommended order:

1. CORS and security headers.
2. Request logger/request id middleware.
3. Infrastructure public routes: log ingestion, health, auth, docs redirects.
4. Public external routes that need raw request access.
5. oRPC/OpenAPI catch-all with one context creation path.
6. Global `app.onError` for unhandled Hono errors.

Procedure middleware belongs in `packages/api/src/lib/procedures/factory.ts`.

- Auth belongs in `protectedProcedure`, not repeated in handlers.
- Org/member/role checks should become named procedure middleware once used by multiple routers.
- API-key/OAuth scopes should become named middleware or procedure factories once external API work starts. Route handlers should declare required scopes, not inspect scope arrays manually.
- Request-scoped logging comes from `context.logger`; handlers should not create standalone request loggers.
- Do not create parallel auth paths unless the caller type is truly different, for example `internalProcedure` or `apiKeyProcedure`.

External route middleware should be route-group specific.

- Webhooks: public DB/context middleware, provider signature verification, idempotency, then handler.
- OAuth callbacks: public DB/context middleware, state verification, token exchange, then redirect/response.
- Public API keys: API-key auth, scope check, org scope, rate limit, then handler.
- File routes: signed-file token or object access middleware before streaming.

## Request Identity

Every backend entry point needs one correlation id.

Preferred rule:

- Use incoming `x-request-id` when present.
- Otherwise use trusted platform trace header when present, for example `cf-ray`.
- Otherwise create `crypto.randomUUID()`.

Propagation rules:

- Store request id in request logger context.
- Include it in API context when downstream code needs audit, idempotency, outbox, or external provider calls.
- Set `X-Request-Id` on external/public responses when practical.
- Include request id in global error handling and public error envelopes.
- Pass it into outbound provider calls, job payloads, audit rows, and outbox events when they originate from a request.
- Never use request id as auth, idempotency key, or business identifier.

## Auth And Org Scope

Use Better Auth as the identity source. Use org/member context for tenant scope.

Rules:

- Session auth stays inside `protectedProcedure` and `createContext`.
- Handlers read `context.session` and org fields; they do not parse cookies or headers directly.
- DB query inputs include `orgId` explicitly for org-owned data.
- Never trust `orgId` from client input unless it is checked against current Better Auth membership.
- External API keys and OAuth access tokens should resolve to the same internal shape: user, org, scopes, and request metadata.

## DB Query Layer

Use `packages/db/src/queries` when persistence behavior matters beyond one handler.

Function shape:

```ts
export async function listInvoices(
  db: DatabaseOrTransaction,
  input: { orgId: string; cursor?: string; limit?: number }
) {
  // Drizzle query here
}
```

Rules:

- Pass `db` or `tx` as the first arg so callers can run transactions.
- Pass one typed object as the second arg.
- Require `orgId` for every org-owned query.
- Return DB-native records or clearly named projections; transport mapping stays in API unless projection is shared.
- Keep audit/outbox/idempotency writes in the same transaction as the business write.
- Avoid importing `db` singleton inside query functions. Let callers choose db/tx.

## Cache

Do not add Redis/cache by default. Add cache only for measurable cost, external rate limits, or repeated cross-request reads.

Cache location:

- In-memory, request-local: inside one function for deduping repeated work during one request.
- Package-level Redis: future `packages/cache` only after at least two server instances or one expensive shared dependency needs it.
- HTTP cache headers: only for public immutable or low-risk reads.

Future `packages/cache` shape:

```text
packages/cache/src/
  redis-client.ts
  health.ts
  <domain>-cache.ts
```

Rules:

- One low-level client module, domain cache wrappers above it.
- Domain wrappers own TTLs and key construction.
- Cache package should not import DB query types. Define cache value types locally or in `packages/core` when shared.
- Include a cheap health probe if Redis becomes a runtime dependency.

Cache key rules:

- Include namespace, entity, org scope, stable input hash, and version when shape can change.
- Never cache raw tokens, cookies, authorization headers, or full sessions.
- Keep auth/permission caches short-lived and invalidated by membership/key changes.
- Prefer explicit invalidation on writes over long TTLs.
- Do not cache org-mutable accounting data until correctness rules are clear.

HTTP cache rules:

- Default `Cache-Control: no-store` for auth, org data, finance data, and mutations.
- Use `private, max-age=<short>` only when stale user-specific data is acceptable.
- Use `public, immutable` only for content-addressed assets.
- ETag support is useful for public or large stable reads, not first implementation of normal oRPC procedures.

## Read-After-Write And Replicas

No replica routing until there is a real replica.

If replicas are introduced later:

- Keep routing in `packages/db`, not per handler.
- Mutations always use primary.
- Reads after mutation should use primary for the affected org for a short TTL.
- Use one org-scoped marker like `org:<orgId>:primary-until`.
- Middleware can mark primary-after-write, but query functions should not know about HTTP methods.

## External Routes And Webhooks

External routes are not normal app procedures.

Rules:

- Mount them before the oRPC/OpenAPI catch-all.
- Verify provider signatures before parsing into domain commands when raw body matters.
- Use constant-time comparison for signatures, tokens, state, and secrets.
- Do not trust `x-forwarded-for` for allowlists unless the deployment has a known trusted proxy chain.
- Store idempotency records for provider event ids or callback state before side effects.
- Respond quickly after durable persistence; use outbox/jobs later for slow follow-up work.
- Normalize provider payloads into internal command objects before touching DB.
- Keep provider-specific errors and retries in provider/domain packages, not route handlers.
- Provider retry policy must be explicit: returning `2xx` acknowledges the event, returning `5xx` asks the provider to retry.

## Env And Config

Keep env access centralized.

- Server runtime reads env from `@tsu-stack/env/server/env`.
- Packages should receive config through constructors/functions unless they are env/bootstrap packages.
- Do not scatter `process.env` reads through routers, middleware, provider clients, or query functions.
- Do not use non-null env assertions in request code. Validate at startup or model optional behavior explicitly.

## Jobs, Outbox, And Workers

Do not add worker packages early.

Use the outbox table first for durable async intent when:

- external side effects must run after DB commit,
- retry is needed,
- request latency would become unacceptable,
- or provider callbacks must be processed exactly once.

Add a job-client/worker package only when a separate worker process exists and at least two producers need the same enqueue/status API.

When that time comes:

- Split producer API (`packages/job-client`) from worker implementation (`packages/jobs`).
- Keep a central typed job registry with Zod payload schemas.
- Do not accept `payload: unknown` across package boundaries.
- Encode queue name, job name, payload schema, result schema, retry policy, and idempotency key rules in one place.
- Use separate DB lifecycle/client setup for worker runtime only after worker runtime exists.

## Health Checks

Health checks should be cheap and side-effect free.

- `/health/live`: process alive; no DB/external calls.
- `/health/ready`: tier-1 dependencies only, short timeouts.
- `/health/dependencies`: optional detailed dependency report for operators.
- Use per-probe timeout.
- Cache expensive external probes briefly.
- Failure of optional integrations should degrade feature status, not fail readiness.

## Abstraction Timing

Inline first when code has one consumer and the behavior is obvious.

Extract to slice-local helper when:

- one router needs the helper in multiple procedures,
- the helper name clarifies a domain step,
- or handler depth becomes hard to scan.

Extract to `packages/api/src/lib` when:

- two or more routers use it,
- it is transport infrastructure,
- or it is middleware/context/error plumbing.

Extract to `packages/db/src/queries` when:

- DB access is reused by API, jobs, external routes, or tests,
- joins/transactions/audit/outbox need consistency,
- or org scoping is subtle enough that duplication would be risky.

Extract to `packages/core` when:

- the same schema, enum, default, formatter, or option list drives API and web,
- a client needs typed error/data handling,
- or changing one domain value should update multiple packages by import.

Extract to a new package when:

- the domain has provider adapters or SDK clients,
- it is consumed by multiple packages,
- it has independent tests,
- or it represents a deploy/runtime boundary.

Do not extract to `utils`, `common`, or `shared` without a specific domain or infrastructure owner.

Avoid package cycles. If two packages want each other's constants, event names, schemas, or notification metadata, move that neutral contract into `packages/core` instead of importing feature packages from DB or infrastructure packages.

Use code-bearing errors for cross-package failures:

- Package errors should expose stable `code` values, retryability where relevant, and safe metadata.
- API layers map package errors into typed oRPC errors or public error envelopes.
- Do not make frontend behavior depend on raw provider messages or string matching.

## Naming

- Use `orgId` for this repo's tenant boundary.
- Use `requestId` for per-request correlation only.
- Use `idempotencyKey` for deduping commands/events.
- Use `providerEventId` for external webhook dedupe.
- Use `snapshot` suffix only for immutable point-in-time copies.
- Use `queries.ts` only while query logic is slice-local; promote to `packages/db/src/queries/<domain>.ts` later.
- Use `handler.ts` for transport-agnostic external route actions.
- Use `verify.ts` for signatures, state, and secret checks.

## Glossary

- `RLS inventory`: checklist of tables and required row-level security behavior. It is not stock/inventory management.
- `orgSnapshot`: immutable copy of org settings at the time of an operation. Needed when invoices, journals, audit rows, or external exports must keep historical org details even if org settings change later.
- `requestId`: correlation id for logs, audit, support, and tracing.
- `idempotency`: dedupe mechanism that makes retried commands safe.
- `outbox`: DB table of committed side-effect intents, processed later by workers or retry loops.
- `external route`: public route called by third parties, providers, CLIs, SDKs, or webhooks, not the app frontend.
- `read-after-write`: routing strategy that avoids stale replica reads immediately after mutations.
- `scope`: permission string attached to API keys/OAuth tokens.

## What To Copy From Midday

- Clear split between runtime app bootstrap, routers, middleware, DB queries, cache, health, and logger packages.
- Public/protected route grouping.
- Thin route handlers that call DB query functions.
- Provider adapter packages for banking/accounting/import-like domains.
- Request trace id used in logs and perf diagnostics.
- Health probes with timeouts and dependency tiers.
- Cache wrappers with domain-specific names and TTLs.

## What Not To Copy

- Supabase RLS/auth assumptions.
- tRPC-specific middleware shape.
- Read replica routing before replicas exist.
- BullMQ/job-client packages before worker runtime exists.
- Large monolithic schema file style.
- Logging every routine request or every provider call if the repo logger policy says not to.
- Generic package explosion before a domain has multiple consumers.
