import { describe, expect, it } from "vite-plus/test";

import { auditEvent, currency, organizationSetting, outboxEvent } from "#@/schema/index";

describe("platform foundation schema", () => {
  it("keeps tenant scope on app-owned tenant tables", () => {
    expect(organizationSetting.organizationId).toBeDefined();
    expect(auditEvent.organizationId).toBeDefined();
    expect(outboxEvent.organizationId).toBeDefined();
  });

  it("keeps currency global", () => {
    expect("organizationId" in currency).toBe(false);
  });
});
