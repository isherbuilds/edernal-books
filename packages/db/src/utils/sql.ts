import { type Column, type SQL, sql } from "drizzle-orm";

/**
 * Escapes LIKE/ILIKE metacharacters so user search text matches literally instead of being
 * treated as wildcards. Backslash is escaped first so the escapes added for `%`/`_` are not
 * double-escaped. Relies on Postgres LIKE's default backslash escape character.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function sqlInList(column: Column, values: readonly string[]): SQL {
  if (values.length === 0) {
    return sql`false`;
  }

  const literals = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  );

  return sql`${column} IN (${literals})`;
}
