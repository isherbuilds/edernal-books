# @tsu-stack/server Architecture

`apps/server` is a runtime shell. It should stay boring: initialize env, create
Hono, mount infrastructure routes, delegate to package-owned handlers, and start
the Node server.

## Middleware And Handler Order

```mermaid
flowchart TD
  Request["Incoming request"] --> BasePath["Hono basePath<br/>VITE_SERVER_URL pathname"]
  BasePath --> CORS["CORS<br/>web origin + credentials"]
  CORS --> ReqLog["Request logger<br/>honoLoggerMiddleware"]
  ReqLog --> ErrorBoundary["app.onError registered"]
  ErrorBoundary --> LogIngest{"POST /_logs/ingest?"}
  LogIngest -->|yes| Ingest["honoLogIngestionMiddleware"]
  LogIngest -->|no| AuthRef{"GET/POST /auth/reference?"}
  AuthRef -->|yes| DocsRedirect["301 docs anchor redirect"]
  AuthRef -->|no| AuthSchema{"GET /auth/open-api/generate-schema?"}
  AuthSchema -->|yes| BetterAuthSchema["auth.api.generateOpenAPISchema"]
  AuthSchema -->|no| AuthRoutes{"/auth/*?"}
  AuthRoutes -->|yes| BetterAuth["auth.handler(raw request)"]
  AuthRoutes -->|no| Context["createContext"]
  Context --> RPC{"RPCHandler matched /rpc?"}
  RPC -->|yes| RPCResponse["return RPC response"]
  RPC -->|no| OpenAPI["OpenAPIHandler docs/spec/REST"]
  OpenAPI --> Next["next() / 404"]
```

## Context Flow

```mermaid
sequenceDiagram
  participant H as Hono middleware
  participant C as createContext
  participant P as Procedure middleware
  participant BA as Better Auth
  participant DB as Database
  participant API as oRPC
  participant L as RequestLogger

  H->>L: c.get("log")
  H->>C: Hono context + logger
  C->>BA: auth.api.getSession(headers)
  BA-->>C: authSession or null
  C->>DB: attach shared db client
  C-->>API: { authSession, db, logger }
  API->>P: run procedure
  P->>P: narrow auth/org context when required
  API->>L: enrich and emit errors
```

## OpenAPI Composition

The server creates one `OpenAPIHandler` from `appRouter`.

It provides:

- JSON schema conversion through `ZodToJsonSchemaConverter`.
- Smart coercion for OpenAPI inputs.
- Scalar reference UI at `/docs` when `ENABLE_OPEN_API_DOCS=true`.
- Spec output at `/docs/spec.json` when `ENABLE_OPEN_API_DOCS=true`.
- Better Auth schema source mounted separately at
  `/auth/open-api/generate-schema`.
- `authCookie` security scheme for protected procedures.

## Error Handling

Unhandled Hono errors flow through `app.onError`:

1. Use request logger when available.
2. Fall back to global `log.error`.
3. Parse unknown thrown value with `parseError`.
4. Return response-safe fields: `message`, optional `code`, `why`, `fix`, `link`.

oRPC handlers additionally attach interceptors that set `handler` on the request
logger before logging errors.

## Deployment Model

Default deployment runs server separately from the web app:

- Web: `/web`, port `3000`.
- Server: `/server`, port `5000`.

Server runtime and production migrations both use `DATABASE_URL`. MVP tenant
isolation is enforced in application/query code through explicit
`organizationId` predicates rather than PostgreSQL RLS policies.

Merged deployment can import `app` from this package into TanStack Start, but it
should be treated as an explicit deployment architecture decision because API
load then shares resources with SSR.

## Extension Points

Add new route groups before the catch-all handler when they need:

- raw request body;
- provider signature verification;
- OAuth callback state handling;
- file streaming;
- custom status/body semantics;
- public API versioning outside current oRPC mapping.

Keep ordinary app procedures in `packages/api`.
