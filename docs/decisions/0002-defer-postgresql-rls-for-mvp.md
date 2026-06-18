# ADR-0002: Defer PostgreSQL RLS for MVP

## Status

Accepted

## Date

2026-06-18

## Context

The repo briefly introduced a custom PostgreSQL RLS model using two database
URLs, a runtime app role, a migration owner role, and transaction helpers that
set a tenant context value before touching tenant-owned tables.

That approach is a real database-level isolation model, but it adds operational
cost early:

- local development needs role bootstrap and grants;
- Docker and Coolify need two database URLs;
- every tenant query must use the correct transaction helper;
- partial adoption is worse than no RLS because it creates a false security
  boundary.

Midday uses Supabase-native RLS, but that model depends on Supabase Auth and
PostgREST request context such as `auth.uid()`, `auth.jwt()`, `authenticated`,
and `service_role`. This repo uses Better Auth with direct Drizzle/Postgres
connections, so those assumptions do not transfer cleanly.

## Decision

Use app-enforced tenancy for MVP and defer PostgreSQL RLS.

The repo uses one required database URL:

- `DATABASE_URL` for runtime queries;
- `DATABASE_URL` for Drizzle generation;
- `DATABASE_URL` for local and production migrations.

Tenant isolation rules:

- API code verifies the caller-provided `orgId` or `orgSlug` against Better
  Auth membership before tenant data access.
- App-owned tenant tables keep an explicit `organization_id`.
- Reusable tenant DB query functions accept `db` or `tx` first, then one typed
  input object containing `organizationId`.
- Every tenant-scoped query includes an `organizationId` predicate.
- Multi-table business writes use one normal database transaction.

## Alternatives Considered

### Keep Custom PostgreSQL RLS Now

Rejected for MVP. It provides a stronger database boundary, but the two-role
setup, grants, transaction-local context, and verification surface slow down
the current foundation work.

### Copy Midday/Supabase RLS Shape

Rejected. Midday's policy shape is tied to Supabase request/auth context. This
repo does not currently run tenant queries through Supabase Auth/PostgREST.

### Disable Tenancy Discipline Entirely

Rejected. Tenant-owned data still needs explicit `organization_id` columns,
membership checks, and scoped queries from the start.

## Consequences

- Local, Docker, and Coolify setup use one database URL.
- Database migrations do not create RLS policies.
- Tenant safety depends on application/query discipline until RLS is revisited.
- Future RLS remains possible because tenant-owned tables keep
  `organization_id`.
- Before enabling PostgreSQL RLS later, the repo needs a fresh ADR covering role
  management, migration ownership, policy shape, verification, and rollout.
