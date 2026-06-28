import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import { normalizeName, nullableTextInput } from "#@/text/index";

describe("normalizeName", () => {
  it("trims, collapses internal whitespace, and lowercases", () => {
    expect(normalizeName("  Acme   Traders  ")).toBe("acme traders");
    expect(normalizeName("Printer\tPaper")).toBe("printer paper");
    expect(normalizeName("ALREADY one")).toBe("already one");
  });

  it("is stable across case and spacing variants so they collide on the unique index", () => {
    expect(normalizeName("Acme Traders")).toBe(normalizeName("  acme   TRADERS "));
  });
});

describe("nullableTextInput", () => {
  const schema = nullableTextInput(z.email().trim().max(320));

  it("treats a blank string as an explicit null", () => {
    expect(schema.parse(" ")).toBeNull();
    expect(schema.parse("")).toBeNull();
  });

  it("passes through valid values, null, and undefined", () => {
    expect(schema.parse("user@example.test")).toBe("user@example.test");
    expect(schema.parse(null)).toBeNull();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("rejects non-empty invalid values", () => {
    expect(schema.safeParse("not-an-email").success).toBe(false);
  });
});
