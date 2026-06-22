import { describe, expect, it } from "vite-plus/test";

import { getRedirectTo } from "@/lib/redirect-to";

describe("getRedirectTo", () => {
  it("falls back to root for empty and external redirects", () => {
    expect(getRedirectTo(undefined)).toBe("/");
    expect(getRedirectTo("http://evil.test")).toBe("/");
    expect(getRedirectTo("//evil.test/login")).toBe("/");
  });

  it("strips locale prefixes and keeps query and hash", () => {
    expect(getRedirectTo("/en/acme/settings/business?tab=tax#gst")).toBe(
      "/acme/settings/business?tab=tax#gst"
    );
  });

  it("bounces guest pages back to root", () => {
    expect(getRedirectTo("/login?redirect=/acme")).toBe("/");
    expect(getRedirectTo("/de/signup")).toBe("/");
  });
});
