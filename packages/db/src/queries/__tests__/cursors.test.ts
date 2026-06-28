import { describe, expect, it } from "vite-plus/test";

import {
  createCursorPage,
  DbCursorError,
  decodeCursor,
  encodeCursor,
  parseNamedKeysetCursor,
  takeCursorPage
} from "#@/queries/cursors";

describe("query cursor helpers", () => {
  it("round-trips named keyset cursors", () => {
    const cursor = encodeCursor({
      id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      normalizedName: "acme traders"
    });

    expect(decodeCursor(cursor, parseNamedKeysetCursor)).toEqual({
      id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      normalizedName: "acme traders"
    });
  });

  it("rejects malformed cursor tokens", () => {
    expect(() => decodeCursor("not-json", parseNamedKeysetCursor)).toThrow(DbCursorError);
    expect(() => decodeCursor(encodeCursor({ id: "" }), parseNamedKeysetCursor)).toThrow(
      DbCursorError
    );
    expect(() =>
      decodeCursor(
        encodeCursor({
          id: "not-a-uuid",
          normalizedName: "acme traders"
        }),
        parseNamedKeysetCursor
      )
    ).toThrow(DbCursorError);
  });

  it("slices limit-plus-one result sets consistently", () => {
    expect(takeCursorPage([1, 2, 3], 2)).toEqual({
      hasNextPage: true,
      pageRows: [1, 2]
    });

    expect(
      createCursorPage([{ id: "1" }, { id: "2" }, { id: "3" }], 2, (row) =>
        encodeCursor({ id: row.id })
      )
    ).toEqual({
      nextCursor: encodeCursor({ id: "2" }),
      pageRows: [{ id: "1" }, { id: "2" }]
    });
  });
});
