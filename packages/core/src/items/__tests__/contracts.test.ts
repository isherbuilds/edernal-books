import { describe, expect, it } from "vite-plus/test";

import {
  CreateItemInputSchema,
  ITEM_ERROR_CODES,
  ITEM_KINDS,
  ITEM_USAGES,
  ItemErrorCodeSchema,
  ItemSchema,
  ListItemsInputSchema,
  UpdateItemInputSchema
} from "#@/items/index";
import { DEFAULT_CURSOR_LIMIT } from "#@/pagination";

describe("item contracts", () => {
  it("separates item kind from sales/purchase usage", () => {
    expect(ITEM_KINDS).toEqual(["goods", "service"]);
    expect(ITEM_USAGES).toEqual(["sales", "purchases", "both"]);
  });

  it("keeps item write error codes in the item contract", () => {
    expect(ITEM_ERROR_CODES).toEqual([
      "ITEM_ACCOUNT_ORGANIZATION_MISMATCH",
      "ITEM_CURSOR_INVALID",
      "ITEM_DUPLICATE_NAME",
      "ITEM_NOT_FOUND"
    ]);

    for (const code of ITEM_ERROR_CODES) {
      expect(ItemErrorCodeSchema.parse(code)).toBe(code);
    }

    expect(ItemErrorCodeSchema.safeParse("NOPE").success).toBe(false);
  });

  it("accepts minimal service item input", () => {
    expect(
      CreateItemInputSchema.parse({
        kind: "service",
        name: "  Consulting  ",
        orgSlug: "demo",
        usage: "sales"
      })
    ).toEqual({
      kind: "service",
      name: "Consulting",
      orgSlug: "demo",
      usage: "sales"
    });
  });

  it("accepts optional rates and account defaults", () => {
    expect(
      CreateItemInputSchema.parse({
        expenseAccountId: "018ff8d9-ae36-7d5b-8f21-8687bde90002",
        kind: "goods",
        name: "Printer Paper",
        orgSlug: "demo",
        purchaseRateMinor: "12500",
        salesAccountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        salesRateMinor: "15000",
        usage: "both"
      })
    ).toMatchObject({
      kind: "goods",
      purchaseRateMinor: "12500",
      salesRateMinor: "15000",
      usage: "both"
    });
  });

  it("rejects negative and raw bigint rates", () => {
    expect(
      CreateItemInputSchema.safeParse({
        kind: "goods",
        name: "Printer Paper",
        orgSlug: "demo",
        salesRateMinor: "-1",
        usage: "sales"
      }).success
    ).toBe(false);

    expect(
      CreateItemInputSchema.safeParse({
        kind: "goods",
        name: "Printer Paper",
        orgSlug: "demo",
        salesRateMinor: 100n,
        usage: "sales"
      }).success
    ).toBe(false);
  });

  it("keeps updates partial but requires id and org slug", () => {
    expect(
      UpdateItemInputSchema.parse({
        id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        isActive: false,
        orgSlug: "demo"
      })
    ).toEqual({
      id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      isActive: false,
      orgSlug: "demo"
    });
  });

  it("parses list filters for active goods/service views", () => {
    expect(
      ListItemsInputSchema.parse({
        includeInactive: true,
        kind: "goods",
        orgSlug: "demo",
        q: " paper ",
        usage: "purchases"
      })
    ).toEqual({
      includeInactive: true,
      kind: "goods",
      limit: DEFAULT_CURSOR_LIMIT,
      orgSlug: "demo",
      q: "paper",
      usage: "purchases"
    });
  });

  it("exposes organization-scoped item DTO shape without inventory fields", () => {
    const item = ItemSchema.parse({
      createdAt: "2026-06-27T00:00:00.000Z",
      description: null,
      expenseAccountId: null,
      hsnCode: null,
      id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      isActive: true,
      kind: "goods",
      name: "Printer Paper",
      normalizedName: "printer paper",
      organizationId: "org_123",
      purchaseRateMinor: "12500",
      salesAccountId: null,
      salesRateMinor: "15000",
      unit: "ream",
      updatedAt: "2026-06-27T00:00:00.000Z",
      usage: "both"
    });

    expect(item).toMatchObject({
      kind: "goods",
      name: "Printer Paper",
      usage: "both"
    });
    expect("quantityOnHand" in item).toBe(false);
    expect("warehouseId" in item).toBe(false);
  });
});
