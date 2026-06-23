# @tsu-stack/logger Architecture

The logger package normalizes logging across browser, Hono server, TanStack
Start, jobs, and scripts.

## Browser Flow

```mermaid
sequenceDiagram
  participant Web as apps/web
  participant Client as logger/client
  participant Drain as HTTP drain
  participant Server as /_logs/ingest
  participant Evlog as evlog server

  Web->>Client: initLog({ batchedTransport })
  Web->>Client: log.info({ event })
  Client->>Drain: batch by size/interval
  Drain->>Server: POST log batch
  Server->>Evlog: honoLogIngestionMiddleware
```

Default web config batches every 2000 ms or 25 events and retries up to 3 times.

## Server Request Flow

```mermaid
sequenceDiagram
  participant H as Hono
  participant MW as honoLoggerMiddleware
  participant C as Context
  participant API as oRPC handler
  participant L as RequestLogger

  H->>MW: incoming request
  MW->>L: create request logger
  H->>C: c.get("log")
  C-->>API: context.logger
  API->>L: set handler/context
  API->>L: error/emit
```

## Logger Types

| Logger                | Use                                               |
| --------------------- | ------------------------------------------------- |
| `log`                 | Simple one-off server/browser events              |
| `createLogger`        | Non-request jobs, scripts, startup/migration work |
| `createRequestLogger` | Request logging without framework middleware      |
| `RequestLogger`       | Request-scoped logger from middleware/context     |

## Error Flow

```mermaid
flowchart LR
  Error["unknown thrown value"] --> Parse["parseError"]
  Parse --> Safe["message/status/code/why/fix/link"]
  Safe --> Response["Hono JSON response"]
  Parse --> Log["structured log event"]
```

`parseError` is used by `apps/server` global error handling to avoid returning
unsafe internals while still logging enough detail.

## Service Names

`LOG_SERVICES` centralizes service identifiers. Use it instead of hand-written
strings when initializing app/package loggers.

## Rules

- Enrich one request log rather than emitting many routine logs.
- Add durable logs only when useful for audit, diagnostics, or operations.
- Redact sensitive fields by default and avoid logging full payloads.
- Use request id/correlation id when future context work adds it.
