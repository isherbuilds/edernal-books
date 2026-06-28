import { describe, expect, it } from "vite-plus/test";

import { toItemInsert } from "#@/queries/items";
import { toPartyInsert } from "#@/queries/parties";

describe("parties and items query helpers", () => {
  it("normalizes party names and nullable fields for inserts", () => {
    expect(
      toPartyInsert({
        displayName: "  Acme   Traders  ",
        email: null,
        gstRegistrationType: "unregistered",
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

  it("preserves an explicit zero rate instead of coercing it to null", () => {
    expect(
      toItemInsert({
        kind: "goods",
        name: "Free Sample",
        organizationId: "org_1",
        purchaseRateMinor: "0",
        salesRateMinor: "0",
        usage: "both"
      })
    ).toMatchObject({
      purchaseRateMinor: 0n,
      salesRateMinor: 0n
    });
  });
});
