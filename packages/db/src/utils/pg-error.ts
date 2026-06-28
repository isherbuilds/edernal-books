/** Postgres driver error shape: SQLSTATE `code` plus the violated `constraint` name when present. */
export type PostgresError = { code: string; constraint?: string };

/** SQLSTATE 23505 — unique_violation. */
export const PG_UNIQUE_VIOLATION = "23505";
/** SQLSTATE 23503 — foreign_key_violation. */
export const PG_FOREIGN_KEY_VIOLATION = "23503";

export function isPostgresError(error: unknown): error is PostgresError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; constraint?: unknown };

  return (
    typeof candidate.code === "string" &&
    (candidate.constraint === undefined || typeof candidate.constraint === "string")
  );
}
