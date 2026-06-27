import { describe, expect, it } from "vite-plus/test";

import { toItemInsert, toPartyInsert } from "#@/queries/owner-records";

describe("owner records query helpers", () => {
  it("normalizes party names and nullable fields for inserts", () => {
    expect(
      toPartyInsert({
        displayName: "  Acme   Traders  ",
        email: null,
        kind: "both",
        organizationId: "org_1"
      })
    ).toMatchObject({
      displayName: "Acme   Traders",
      email: null,
      kind: "both",
      normalizedName: "acme traders",
      organizationId: "org_1"
    });
  });

  it("normalizes item names and converts minor-unit strings for inserts", () => {
    expect(
      toItemInsert({
        kind: "goods",
        name: "  Printer   Paper  ",
        organizationId: "org_1",
        purchaseRateMinor: "12500",
        salesRateMinor: "15000",
        usage: "both"
      })
    ).toMatchObject({
      kind: "goods",
      name: "Printer   Paper",
      normalizedName: "printer paper",
      organizationId: "org_1",
      purchaseRateMinor: 12500n,
      salesRateMinor: 15000n,
      usage: "both"
    });
  });

  it("keeps optional account defaults null when omitted", () => {
    expect(
      toItemInsert({
        kind: "service",
        name: "Consulting",
        organizationId: "org_1",
        usage: "sales"
      })
    ).toMatchObject({
      expenseAccountId: null,
      purchaseRateMinor: null,
      salesAccountId: null,
      salesRateMinor: null
    });
  });
});
