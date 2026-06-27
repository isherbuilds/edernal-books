import { describe, expect, it } from "vite-plus/test";

import { item, party } from "#@/schema/index";

describe("parties and items schema", () => {
  it("tenant-scopes Phase 2 owner workflow tables", () => {
    expect(party.organizationId).toBeDefined();
    expect(item.organizationId).toBeDefined();
  });

  it("supports party and item classification fields", () => {
    expect(party.kind).toBeDefined();
    expect(party.normalizedName).toBeDefined();
    expect(item.kind).toBeDefined();
    expect(item.usage).toBeDefined();
    expect(item.normalizedName).toBeDefined();
  });

  it("keeps optional item defaults without requiring inventory", () => {
    expect(item.salesRateMinor).toBeDefined();
    expect(item.purchaseRateMinor).toBeDefined();
    expect(item.salesAccountId).toBeDefined();
    expect(item.expenseAccountId).toBeDefined();
  });

  it("does not add stock inventory fields in Phase 2", () => {
    expect("trackInventory" in item).toBe(false);
    expect("maintainStock" in item).toBe(false);
    expect("warehouseId" in item).toBe(false);
    expect("quantityOnHand" in item).toBe(false);
    expect("batchSeries" in item).toBe(false);
    expect("serialNumberSeries" in item).toBe(false);
    expect("valuationRateMinor" in item).toBe(false);
  });
});
