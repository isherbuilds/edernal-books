export class DbCursorError extends Error {
  constructor() {
    super("CURSOR_INVALID");
  }
}

export type NamedKeysetCursor = {
  id: string;
  normalizedName: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor<T>(cursor: string, parsePayload: (payload: unknown) => T | null): T {
  let payload: unknown;

  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
  } catch {
    throw new DbCursorError();
  }

  const parsed = parsePayload(payload);
  if (!parsed) {
    throw new DbCursorError();
  }

  return parsed;
}

export function parseNamedKeysetCursor(payload: unknown): NamedKeysetCursor | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (!("id" in payload) || !("normalizedName" in payload)) {
    return null;
  }

  if (
    typeof payload.id !== "string" ||
    typeof payload.normalizedName !== "string" ||
    !UUID_REGEX.test(payload.id) ||
    payload.normalizedName.length === 0
  ) {
    return null;
  }

  return {
    id: payload.id,
    normalizedName: payload.normalizedName
  };
}

export function takeCursorPage<T>(
  rows: readonly T[],
  limit: number
): {
  hasNextPage: boolean;
  pageRows: T[];
} {
  return {
    hasNextPage: rows.length > limit,
    pageRows: rows.slice(0, limit)
  };
}

export function createCursorPage<T>(
  rows: readonly T[],
  limit: number,
  encodeRow: (row: T) => string
): {
  nextCursor: string | null;
  pageRows: T[];
} {
  const { hasNextPage, pageRows } = takeCursorPage(rows, limit);
  const lastRow = pageRows.at(-1);

  return {
    nextCursor: hasNextPage && lastRow ? encodeRow(lastRow) : null,
    pageRows
  };
}
