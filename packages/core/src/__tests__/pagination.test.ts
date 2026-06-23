import { describe, expect, it } from "vite-plus/test";

import {
  clampCursorLimit,
  clampPage,
  createPaginationOutput,
  CursorPaginationInputSchema,
  DEFAULT_CURSOR_LIMIT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
} from "#@/pagination";

describe("pagination helpers", () => {
  it("uses cursor pagination defaults for accounting lists", () => {
    expect(CursorPaginationInputSchema.parse({})).toEqual({
      limit: DEFAULT_CURSOR_LIMIT
    });
  });

  it("clamps cursor limits", () => {
    expect(clampCursorLimit({ limit: 500 })).toBe(MAX_PAGE_SIZE);
    expect(clampCursorLimit({ limit: 0 })).toBe(1);
  });

  it("uses safe defaults for missing pagination input", () => {
    expect(clampPage({})).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
      page: 1
    });
  });

  it("clamps invalid page and oversized limits", () => {
    expect(clampPage({ limit: 500, page: -4 })).toEqual({
      limit: MAX_PAGE_SIZE,
      offset: 0,
      page: 1
    });
  });

  it("returns stable pagination metadata", () => {
    expect(createPaginationOutput({ limit: 25, page: 2, totalItems: 51 })).toEqual({
      hasMore: true,
      limit: 25,
      page: 2,
      totalItems: 51,
      totalPages: 3
    });
  });
});
