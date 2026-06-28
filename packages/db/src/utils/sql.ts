import { type Column, type SQL, sql } from "drizzle-orm";

/**
 * Escapes LIKE/ILIKE metacharacters so user search text matches literally instead of being
 * treated as wildcards. Backslash is escaped first so the escapes added for `%`/`_` are not
 * double-escaped. Relies on Postgres LIKE's default backslash escape character.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Builds a `column IN ('a', 'b', ...)` SQL fragment from a shared enum array so CHECK constraints
 * stay derived from the same source of truth as the column's enum type and can never drift.
 * Values are trusted compile-time enum literals, not user input.
 */
export function sqlInList(column: Column, values: readonly string[]): SQL {
  const literals = values.map((value) => `'${value}'`).join(", ");

  return sql`${column} IN (${sql.raw(literals)})`;
}
