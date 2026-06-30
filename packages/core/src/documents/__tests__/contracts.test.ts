import { describe, expect, it } from "vite-plus/test";

import {
  CreateAndPostPurchaseDocumentInputSchema,
  CreateAndPostSalesDocumentInputSchema,
  CreateAndPostSettlementInputSchema,
  CreatePurchaseDocumentDraftInputSchema,
  CreateSalesDocumentDraftInputSchema,
  CreateSettlementDraftInputSchema,
  GetSalesDocumentInputSchema,
  DOCUMENT_STATUSES,
  DocumentDetailSchema,
  PAYMENT_MODES,
  SETTLEMENT_DIRECTIONS,
  SalesDocumentSchema,
  UpdatePurchaseDocumentDraftInputSchema,
  UpdateSalesDocumentDraftInputSchema,
  UpdateSettlementDraftInputSchema,
  VoidSalesDocumentInputSchema
} from "#@/documents/index";

const UUID_1 = "018ff8d9-ae36-7d5b-8f21-8687bde90001";
const UUID_2 = "018ff8d9-ae36-7d5b-8f21-8687bde90002";
const UUID_3 = "018ff8d9-ae36-7d5b-8f21-8687bde90003";
const UUID_4 = "018ff8d9-ae36-7d5b-8f21-8687bde90004";

describe("document contracts", () => {
  it("exposes reviewed lifecycle and settlement enums", () => {
    expect(DOCUMENT_STATUSES).toEqual(["draft", "posted", "voided"]);
    expect(SETTLEMENT_DIRECTIONS).toEqual(["received", "paid"]);
    expect(PAYMENT_MODES).toEqual(["cash", "bank_transfer", "upi", "card", "cheque", "other"]);
  });

  it("creates sales invoice drafts without official document numbers", () => {
    const input = CreateSalesDocumentDraftInputSchema.parse({
      customerPartyId: UUID_1,
      dueDate: "2026-07-15",
      invoiceDate: "2026-06-28",
      lines: [
        {
          description: "Consulting",
          incomeAccountId: UUID_2,
          quantity: "2",
          rateMinor: "500000",
          unit: "hours"
        }
      ],
      orgSlug: "demo"
    });

    expect(input.lines[0]).toMatchObject({
      quantity: "2",
      rateMinor: "500000"
    });
    expect(
      CreateSalesDocumentDraftInputSchema.safeParse({ ...input, documentNumber: "INV-1" }).success
    ).toBe(false);
  });

  it("keeps create-and-post document ids server-owned", () => {
    expect(
      CreateAndPostSalesDocumentInputSchema.parse({
        customerPartyId: UUID_1,
        invoiceDate: "2026-06-28",
        lines: [
          {
            description: "Consulting",
            incomeAccountId: UUID_2,
            quantity: "1",
            rateMinor: "500000"
          }
        ],
        orgSlug: "demo"
      })
    ).toMatchObject({
      invoiceDate: "2026-06-28"
    });

    expect(
      CreateAndPostSalesDocumentInputSchema.safeParse({
        customerPartyId: UUID_1,
        documentId: UUID_2,
        invoiceDate: "2026-06-28",
        lines: [
          {
            description: "Consulting",
            incomeAccountId: UUID_2,
            quantity: "1",
            rateMinor: "500000"
          }
        ],
        orgSlug: "demo"
      }).success
    ).toBe(false);

    expect(
      CreateAndPostPurchaseDocumentInputSchema.safeParse({
        documentId: UUID_2,
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: UUID_3,
            quantity: "1",
            rateMinor: "10000"
          }
        ],
        orgSlug: "demo",
        purchaseDate: "2026-06-28",
        vendorPartyId: UUID_1
      }).success
    ).toBe(false);

    expect(
      CreateAndPostSettlementInputSchema.safeParse({
        allocations: [
          {
            amountMinor: "250000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "received",
        documentId: UUID_4,
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      }).success
    ).toBe(false);
  });

  it("keeps purchase bill and expense drafts in one purchase contract", () => {
    expect(
      CreatePurchaseDocumentDraftInputSchema.parse({
        documentKind: "purchase_bill",
        dueDate: "2026-07-10",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: UUID_2,
            quantity: "1",
            rateMinor: "120000"
          }
        ],
        orgSlug: "demo",
        purchaseDate: "2026-06-28",
        vendorPartyId: UUID_1,
        vendorReferenceNumber: "BILL-42"
      })
    ).toMatchObject({
      documentKind: "purchase_bill",
      vendorReferenceNumber: "BILL-42"
    });
  });

  it("updates drafts without accepting official document numbers", () => {
    expect(
      UpdateSalesDocumentDraftInputSchema.safeParse({
        customerPartyId: UUID_1,
        documentId: UUID_2,
        documentNumber: "INV-1",
        invoiceDate: "2026-06-28",
        lines: [
          {
            description: "Consulting",
            incomeAccountId: UUID_3,
            quantity: "1",
            rateMinor: "500000"
          }
        ],
        orgSlug: "demo"
      }).success
    ).toBe(false);

    expect(
      UpdatePurchaseDocumentDraftInputSchema.parse({
        documentId: UUID_2,
        documentKind: "expense",
        lines: [
          {
            description: "Travel",
            expenseAccountId: UUID_3,
            quantity: "1",
            rateMinor: "10000"
          }
        ],
        orgSlug: "demo",
        purchaseDate: "2026-06-28",
        vendorPartyId: UUID_1
      })
    ).toMatchObject({
      documentKind: "expense"
    });

    expect(
      UpdateSettlementDraftInputSchema.parse({
        allocations: [
          {
            amountMinor: "250000",
            targetDocumentId: UUID_4,
            targetDocumentKind: "purchase_bill"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "paid",
        documentId: UUID_3,
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      })
    ).toMatchObject({
      direction: "paid"
    });
  });

  it("creates settlement drafts with full typed allocations", () => {
    expect(
      CreateSettlementDraftInputSchema.parse({
        allocations: [
          {
            amountMinor: "250000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "received",
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      })
    ).toMatchObject({
      allocations: [{ targetDocumentKind: "sales_invoice" }],
      direction: "received",
      paymentMode: "upi"
    });

    expect(
      CreateSettlementDraftInputSchema.safeParse({
        allocations: [],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "received",
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      }).success
    ).toBe(false);

    expect(
      CreateSettlementDraftInputSchema.safeParse({
        allocations: [
          {
            amountMinor: "200000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "received",
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      }).success
    ).toBe(false);

    expect(
      CreateSettlementDraftInputSchema.safeParse({
        allocations: [
          {
            amountMinor: "100000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "sales_invoice"
          },
          {
            amountMinor: "150000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "received",
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      }).success
    ).toBe(false);

    expect(
      CreateSettlementDraftInputSchema.safeParse({
        allocations: [
          {
            amountMinor: "100000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "purchase_bill"
          },
          {
            amountMinor: "150000",
            targetDocumentId: UUID_3,
            targetDocumentKind: "expense"
          }
        ],
        amountMinor: "250000",
        cashAccountId: UUID_2,
        direction: "paid",
        orgSlug: "demo",
        partyId: UUID_1,
        paymentMode: "upi",
        settlementDate: "2026-06-28"
      }).success
    ).toBe(false);
  });

  it("voids with document identity instead of user-entered numbers", () => {
    expect(
      VoidSalesDocumentInputSchema.parse({
        documentId: UUID_1,
        orgSlug: "demo",
        reason: "Created against wrong customer",
        voidDate: "2026-06-29"
      })
    ).toMatchObject({
      reason: "Created against wrong customer"
    });
  });

  it("rejects oversized document line inputs before persistence", () => {
    const oversizedQuantity = CreateSalesDocumentDraftInputSchema.safeParse({
      customerPartyId: UUID_1,
      invoiceDate: "2026-06-28",
      lines: [
        {
          description: "Consulting",
          incomeAccountId: UUID_2,
          quantity: "1234567890123",
          rateMinor: "500000",
          unit: "hours"
        }
      ],
      orgSlug: "demo"
    });
    expect(oversizedQuantity.success).toBe(false);

    const tooManyLines = CreateSalesDocumentDraftInputSchema.safeParse({
      customerPartyId: UUID_1,
      invoiceDate: "2026-06-28",
      lines: Array.from({ length: 201 }, () => {
        return {
          description: "Consulting",
          incomeAccountId: UUID_2,
          quantity: "1",
          rateMinor: "500000",
          unit: "hours"
        };
      }),
      orgSlug: "demo"
    });
    expect(tooManyLines.success).toBe(false);
  });

  it("represents draft references separately from official document numbers", () => {
    const draft = SalesDocumentSchema.parse({
      customerPartyId: UUID_1,
      documentKind: "sales_invoice",
      documentNumber: null,
      draftReference: "DRAFT-001",
      dueDate: "2026-07-15",
      id: UUID_2,
      invoiceDate: "2026-06-28",
      journalEntryId: null,
      lines: [],
      notes: null,
      organizationId: "org_1",
      outstandingMinor: "0",
      postedAt: null,
      postedByUserId: null,
      status: "draft",
      terms: null,
      totalMinor: "0",
      voidReason: null,
      voidedAt: null,
      voidedByUserId: null
    });
    const posted = SalesDocumentSchema.parse({
      ...draft,
      documentNumber: "INV-0001",
      journalEntryId: UUID_3,
      postedAt: "2026-06-28T10:00:00.000Z",
      postedByUserId: "user_1",
      status: "posted"
    });

    expect(draft.documentNumber).toBeNull();
    expect(draft).not.toHaveProperty("source" + "DocumentId");
    expect(posted.documentNumber).toBe("INV-0001");
    expect(posted).not.toHaveProperty("source" + "DocumentId");
    expect(DocumentDetailSchema.parse(posted)).toMatchObject({
      documentKind: "sales_invoice",
      documentNumber: "INV-0001"
    });
    expect(
      GetSalesDocumentInputSchema.parse({
        documentId: UUID_2,
        orgSlug: "demo"
      })
    ).toMatchObject({
      documentId: UUID_2
    });
  });
});
