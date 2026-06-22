import { describe, expect, it } from "vite-plus/test";

import { stripLocalePrefix } from "#@/tanstack-start/lib/strip-locale-prefix";

describe("stripLocalePrefix", () => {
  it("strips locale route prefixes", () => {
    expect(stripLocalePrefix("/en/acme/settings")).toBe("/acme/settings");
    expect(stripLocalePrefix("/de/acme/settings")).toBe("/acme/settings");
    expect(stripLocalePrefix("/{-$locale}/acme/settings")).toBe("/acme/settings");
  });

  it("keeps non-localized paths unchanged", () => {
    expect(stripLocalePrefix("/acme/settings")).toBe("/acme/settings");
  });
});
