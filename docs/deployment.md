# Deployment

This repo deploys as separate web, server, migrator, and PostgreSQL services by
default. The Docker Compose files support local Docker and Coolify-style
deployments.

## Services

| Service    | Image stage                         | Purpose                                      |
| ---------- | ----------------------------------- | -------------------------------------------- |
| `web`      | `apps/web/Dockerfile` production    | TanStack Start app on port `3000`            |
| `server`   | `apps/server/Dockerfile` production | Hono/oRPC API on port `5000`                 |
| `migrate`  | `apps/server/Dockerfile` migrator   | Runs Drizzle migrations before server starts |
| `postgres` | `postgres:18-alpine`                | Primary PostgreSQL database                  |

The `server` service depends on `migrate`. The `web` service depends on
`server`.

## Database URL

MVP uses one database URL:

| Env            | Used by                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | app runtime, Better Auth, API queries, health checks, Drizzle Kit, `db:migrate`, production migrator |

PostgreSQL RLS is intentionally deferred. Tenant isolation is application-owned:
authenticated API code verifies the caller-provided `orgId` or `orgSlug`
against Better Auth membership, then passes the verified `organizationId` into
DB query functions. Tenant-owned tables still carry `organization_id` so
database RLS can be added later without redesigning the data model.

See [ADR-0002](decisions/0002-defer-postgresql-rls-for-mvp.md) for the
rationale.

## Local Development

Local templates use:

```txt
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/tsu-stack
```

Typical local flow:

```bash
rtk vp run db:dev:start
rtk vp run db:migrate
rtk vp run dev
```

`db:migrate`, Drizzle generation, runtime server code, and health checks all use
`DATABASE_URL`.

## Docker And Coolify

`docker-compose.yaml` and `docker-compose.coolify.yaml` pass `DATABASE_URL` to
build and runtime environments. The bundled PostgreSQL service uses its normal
Postgres credentials directly; there is no app-role bootstrap script.

For an external managed database, set:

```txt
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
```

## Midday Reference Boundary

Midday remains useful inspiration for package composition: `client.ts`, query
modules, DB-local utilities, and schema-declared policies. Their RLS model is
Supabase-native: policies use Supabase `auth.uid()`, `auth.jwt()`, roles such
as `authenticated` and `service_role`, and helpers such as
`private.get_teams_for_authenticated_user()`. Their direct Drizzle client does
not set an equivalent of a per-transaction tenant GUC.

This repo uses Better Auth with direct Drizzle/Postgres connections. For MVP we
are taking the simpler path: app-enforced tenancy with explicit
`organizationId` filters and one database URL. PostgreSQL RLS can be revisited
post-MVP if we decide the operational cost is worth it.
