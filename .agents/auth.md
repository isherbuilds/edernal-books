# Auth Patterns

## Architecture

- **Server**: Better Auth handles `/auth/*` on the Hono server (`apps/server`)
- **Client**: `authClient` from `@tsu-stack/auth` (nanostore-based, client-side only)
- **SSR**: `$getUser` server function resolves session from request headers, forwards `Set-Cookie` for refresh
- **Cookies**: Prefer Better Auth defaults for reusable projects — `SameSite=Lax` supports OAuth and other redirect-based flows without custom per-project overrides

## Query Pattern

Auth user query is defined in `@tsu-stack/auth`:

- `getAuthUserQueryOptions()` — staleTime 5 min, gcTime 10 min, refetchOnWindowFocus "always"
- Guest routes use `getAuthUserQueryOptions()` to redirect authenticated users away from login/signup pages
- Auth-guarded routes first fetch the current user, then fetch protected organization membership only after a user exists

## Route Guards

### Protected routes (`_app/` pathless group)

- `beforeLoad` fetches the authenticated user and organization membership before protected UI renders
- No user → redirects to `/login?redirect=<current-path>`
- No organization membership → redirects to organization setup
- Client-side `useEffect` should not repeat the same redirect logic already handled by `beforeLoad`
- `$orgSlug` child routes verify the slug against the membership list and show not found when access fails
- Bare organization slugs must not use reserved top-level paths or locale codes
- Top-level compatibility redirects such as `/dashboard` should use the first accessible organization from the protected organization list
- `/` should redirect authenticated users to `/$orgSlug` for the active organization dashboard or `/$orgSlug/onboarding` when setup is not complete. `/home` is the explicit public home route for signed-in users. Do not keep `/$orgSlug/dashboard` when `/$orgSlug` is the dashboard.
- Seed the auth user query from Better Auth login/signup responses instead of invalidating it only to refetch the same user. Remove or invalidate protected organization list queries after organization membership or onboarding completion changes.
- Do not persist auth-bound React Query data to browser storage. Session and organization route state must come from cookies/server checks each browser session, and sign-out must clear the in-memory QueryClient before rerunning route guards.

### Guest-only routes (`_guest/` pathless group)

- Authenticated users → redirected to stored redirect path
- `?redirect` param validated against route tree (sanitized)

## Onboarding State

- Gate first-run business setup from server-backed auth/organization state, not local storage.
- Follow the Midday pattern: fetch the current user/session and team/organization membership once for protected app routing, then redirect from layout `beforeLoad` hooks.
- In this repo, first-run completion is the nullable Better Auth organization `additionalFields` column `organization.onboardingCompletedAt`.
- Treat `organization.onboardingCompletedAt` as the route source of truth. Do not infer completion from `organization_setting`, because settings can exist before the onboarding flow is complete.
- Completion writes must be idempotent and preserve the first `onboardingCompletedAt` timestamp. Retries may update settings, but must not move the completion time.
- Current onboarding step is lightweight URL UI state (`?step=1..N`) and is not persisted server-side. Do not store step progress without also storing draft form values.
- Direct `/$orgSlug/onboarding` access is allowed only while `onboardingCompletedAt` is null. A future "run onboarding again" flow should clear the field or use an explicit reset command before showing the route again.

## Middleware

Two auth middlewares exist for different sensitivity levels:

| Middleware            | Behavior                                 | Use case                                     |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| `authMiddleware`      | Uses cached session (5-min cookie cache) | Normal protected pages                       |
| `freshAuthMiddleware` | Hits DB, bypasses cache                  | Sensitive operations (password change, etc.) |

Both set 401 status and throw on unauthorized.

## Schema Extension

When extending the Better Auth `user`, `session`, or plugin-owned schema, update all three layers together:

- **Server auth config**: add the field under `additionalFields` in `packages/auth/src/index.ts`
- **Drizzle schema**: add the matching column in `packages/db/src/schema/auth.schema.ts`
- **Client inference**: keep `packages/auth/src/react/auth-client.ts` using the matching Better Auth inference helper (`inferAdditionalFields` for user/session fields, `inferOrgAdditionalFields` for organization plugin fields) so custom fields stay typed on the client

For DB-backed auth fields, also generate and apply a Drizzle migration after the schema change.

## Gotchas

- Cross-domain auth setups still require deliberate cookie/domain/CORS configuration even with Better Auth defaults
- `SameSite=Strict` is usually too brittle for OAuth, email links, and other redirect-based auth flows
- The auth query uses `refetchOnWindowFocus: "always"` for cross-tab session sync
- Better Auth custom fields are not complete if you only add the DB column; the auth config and client inference must be updated too
- In this repo, use Drizzle `0.45.x` relation objects: auth-owned relations live beside auth tables in `packages/db/src/schema/auth.schema.ts`, app-owned relations live in `packages/db/src/schema/relations.ts`, and `packages/db/src/schema/index.ts` exports both tables and relation objects for `drizzle(client, { schema })`.
