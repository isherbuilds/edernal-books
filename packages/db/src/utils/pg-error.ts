/** Postgres driver error shape: SQLSTATE `code` plus the violated `constraint` name when present. */
export type PostgresError = { code: string; constraint?: string };

/** SQLSTATE 23505 — unique_violation. */
export const PG_UNIQUE_VIOLATION = "23505";
/** SQLSTATE 23503 — foreign_key_violation. */
export const PG_FOREIGN_KEY_VIOLATION = "23503";

export function isPostgresError(error: unknown): error is PostgresError {
  return typeof error === "object" && error !== null && "code" in error;
}
