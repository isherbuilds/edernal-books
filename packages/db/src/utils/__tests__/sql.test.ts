import { PgDialect, pgTable, text } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vite-plus/test";

import { escapeLikePattern, sqlInList } from "#@/utils/sql";

const dialect = new PgDialect();

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards so search text matches literally", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes the backslash first so wildcard escapes are not double-escaped", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
    expect(escapeLikePattern("100%\\_done")).toBe("100\\%\\\\\\_done");
  });

  it("leaves text without metacharacters untouched", () => {
    expect(escapeLikePattern("Acme Traders")).toBe("Acme Traders");
  });
});

describe("sqlInList", () => {
  const widget = pgTable("widget", {
    kind: text("kind").notNull()
  });

  it("builds a parameterized IN list from a shared enum array", () => {
    const { params, sql } = dialect.sqlToQuery(sqlInList(widget.kind, ["goods", "service"]));

    expect(sql).toBe(`"widget"."kind" IN ($1, $2)`);
    expect(params).toEqual(["goods", "service"]);
  });

  it("preserves enum order and spacing for a three-value list", () => {
    const { params, sql } = dialect.sqlToQuery(
      sqlInList(widget.kind, ["sales", "purchases", "both"])
    );

    expect(sql).toContain(`IN ($1, $2, $3)`);
    expect(params).toEqual(["sales", "purchases", "both"]);
  });

  it("returns a false condition for empty lists", () => {
    const { params, sql } = dialect.sqlToQuery(sqlInList(widget.kind, []));

    expect(sql).toBe("false");
    expect(params).toEqual([]);
  });
});
