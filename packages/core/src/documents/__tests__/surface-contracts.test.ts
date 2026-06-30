import { describe, expect, it } from "vite-plus/test";

import {
  AllocationTargetSchema,
  ListAllocationTargetsInputSchema,
  ListAllocationTargetsOutputSchema,
  ListPurchaseDocumentsInputSchema,
  ListSalesDocumentsInputSchema,
  ListSettlementsInputSchema,
  DOCUMENT_ERROR_CODES
} from "#@/documents/index";

const UUID_1 = "018ff8d9-ae36-7d5b-8f21-8687bde90001";
const UUID_2 = "018ff8d9-ae36-7d5b-8f21-8687bde90002";

describe("document surface contracts", () => {
  it("exposes a period-closed error code", () => {
    expect(DOCUMENT_ERROR_CODES).toContain("DOCUMENT_PERIOD_CLOSED");
  });

  it("lists sales documents with optional status and cursor", () => {
    expect(
      ListSalesDocumentsInputSchema.parse({ orgSlug: "demo", status: "posted" })
    ).toMatchObject({ orgSlug: "demo", status: "posted" });
    // default cursor limit is applied
    expect(ListSalesDocumentsInputSchema.parse({ orgSlug: "demo" }).limit).toBe(30);
  });

  it("filters purchase documents by bill or expense kind only", () => {
    expect(
      ListPurchaseDocumentsInputSchema.parse({ documentKind: "expense", orgSlug: "demo" })
    ).toMatchObject({ documentKind: "expense" });
    expect(
      ListPurchaseDocumentsInputSchema.safeParse({ documentKind: "sales_invoice", orgSlug: "demo" })
        .success
    ).toBe(false);
  });

  it("filters settlements by direction", () => {
    expect(
      ListSettlementsInputSchema.parse({ direction: "received", orgSlug: "demo" })
    ).toMatchObject({ direction: "received" });
    expect(
      ListSettlementsInputSchema.safeParse({ direction: "sideways", orgSlug: "demo" }).success
    ).toBe(false);
  });

  it("requests allocation targets scoped to a party and direction", () => {
    expect(
      ListAllocationTargetsInputSchema.parse({
        direction: "received",
        limit: 50,
        orgSlug: "demo",
        partyId: UUID_1
      })
    ).toMatchObject({ direction: "received", limit: 50, partyId: UUID_1 });
  });

  it("describes an allocation target with an outstanding balance", () => {
    expect(
      AllocationTargetSchema.parse({
        documentDate: "2026-06-28",
        documentKind: "sales_invoice",
        documentNumber: "INV-0001",
        id: UUID_2,
        outstandingMinor: "150000",
        totalMinor: "250000"
      })
    ).toMatchObject({ documentNumber: "INV-0001", outstandingMinor: "150000" });
  });

  it("returns allocation targets with a next cursor", () => {
    expect(
      ListAllocationTargetsOutputSchema.parse({
        nextCursor: "next-page",
        targets: []
      })
    ).toMatchObject({ nextCursor: "next-page", targets: [] });
  });
});
