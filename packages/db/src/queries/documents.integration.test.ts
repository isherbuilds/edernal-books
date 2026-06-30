import { and, eq, gte, lte } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vite-plus/test";

import {
  type PostedDocument,
  type PurchaseDocument,
  type SalesDocument,
  type SettlementDocument
} from "@tsu-stack/core/documents";

import { type Database } from "#@/client";
import { numberSequence } from "#@/schema/accounts";
import { purchaseDocument, salesDocument, settlementDocument } from "#@/schema/documents";
import { journalEntry, journalLine } from "#@/schema/journal";
import { accountingPeriod } from "#@/schema/periods";

import {
  createAndPostPurchaseDocument,
  createAndPostSalesDocument,
  createAndPostSettlement,
  createSalesDocumentDraft,
  createPurchaseDocumentDraft,
  createSettlementDraft,
  getSalesDocument,
  listAllocationTargets,
  listSalesDocuments,
  listSettlementDocuments,
  updateAndPostPurchaseDocument,
  updateAndPostSalesDocument,
  updateAndPostSettlement,
  updatePurchaseDocumentDraft,
  updateSalesDocumentDraft,
  voidSalesDocument
} from "./documents";
import {
  createDocumentContext,
  describeDocumentIntegration,
  loadDocumentIntegrationDb,
  makeSalesLine,
  shouldRunDocumentIntegration
} from "./documents.integration-fixtures";
import { createParty } from "./parties";

let integrationDb: Database;
let closeIntegrationDb: (() => Promise<void>) | undefined;

type DocumentIntegrationContext = Awaited<ReturnType<typeof createDocumentContext>>;

beforeAll(async () => {
  if (!shouldRunDocumentIntegration) {
    return;
  }

  const client = await loadDocumentIntegrationDb();
  integrationDb = client.integrationDb;
  closeIntegrationDb = client.closeIntegrationDb;
});

afterAll(async () => {
  await closeIntegrationDb?.();
});

async function postSalesDraft(
  document: SalesDocument,
  context: DocumentIntegrationContext
): Promise<PostedDocument> {
  return updateAndPostSalesDocument(integrationDb, {
    customerPartyId: document.customerPartyId,
    documentId: document.id,
    dueDate: document.dueDate ?? undefined,
    invoiceDate: document.invoiceDate,
    lines: document.lines.map((line) => {
      return {
        description: line.description,
        hsnCode: line.hsnCode,
        incomeAccountId: line.incomeAccountId,
        itemId: line.itemId,
        quantity: line.quantity,
        rateMinor: line.rateMinor,
        unit: line.unit
      };
    }),
    notes: document.notes,
    organizationId: context.organizationId,
    terms: document.terms,
    userId: context.userId
  });
}

async function postPurchaseDraft(
  document: PurchaseDocument,
  context: DocumentIntegrationContext
): Promise<PostedDocument> {
  return updateAndPostPurchaseDocument(integrationDb, {
    documentId: document.id,
    documentKind: document.documentKind,
    dueDate: document.dueDate ?? undefined,
    lines: document.lines.map((line) => {
      return {
        description: line.description,
        expenseAccountId: line.expenseAccountId,
        hsnCode: line.hsnCode,
        itemId: line.itemId,
        quantity: line.quantity,
        rateMinor: line.rateMinor,
        unit: line.unit
      };
    }),
    notes: document.notes,
    organizationId: context.organizationId,
    purchaseDate: document.purchaseDate,
    userId: context.userId,
    vendorPartyId: document.vendorPartyId,
    vendorReferenceNumber: document.vendorReferenceNumber
  });
}

async function postSettlementDraft(
  document: SettlementDocument,
  context: DocumentIntegrationContext
): Promise<PostedDocument> {
  return updateAndPostSettlement(integrationDb, {
    allocations: document.allocations.map((allocation) => {
      return {
        amountMinor: allocation.amountMinor,
        targetDocumentId: allocation.targetDocumentId,
        targetDocumentKind: allocation.targetDocumentKind
      };
    }),
    amountMinor: document.amountMinor,
    cashAccountId: document.cashAccountId,
    direction: document.direction,
    documentId: document.id,
    notes: document.notes,
    organizationId: context.organizationId,
    partyId: document.partyId,
    paymentMode: document.paymentMode,
    reference: document.reference,
    settlementDate: document.settlementDate,
    userId: context.userId
  });
}

describeDocumentIntegration("document database integration", () => {
  it("does not allocate official invoice numbers until post", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const skippedDraft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });

      await integrationDb
        .delete(salesDocument)
        .where(
          and(
            eq(salesDocument.id, skippedDraft.id),
            eq(salesDocument.organizationId, context.organizationId)
          )
        );

      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-16",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      const updatedDraft = await updateSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        documentId: draft.id,
        invoiceDate: "2025-04-16",
        lines: [makeSalesLine(context, "15000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      const posted = await postSalesDraft(updatedDraft, context);
      await expect(postSalesDraft(updatedDraft, context)).rejects.toThrow("DOCUMENT_NOT_FOUND");

      expect(draft.documentNumber).toBeNull();
      expect(updatedDraft).toMatchObject({
        documentNumber: null,
        totalMinor: "15000"
      });
      expect(posted).toMatchObject({
        documentKind: "sales_invoice",
        documentNumber: "INV-25-26-000001"
      });

      const detail = await getSalesDocument(integrationDb, {
        documentId: draft.id,
        organizationId: context.organizationId
      });

      expect(detail).toMatchObject({
        customerPartyName: "Acme Traders",
        documentKind: "sales_invoice",
        documentNumber: "INV-25-26-000001",
        lines: [{ description: "Consulting", totalMinor: "15000" }]
      });

      const [salesSequence] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(
          and(
            eq(numberSequence.entityType, "sales_invoice"),
            eq(numberSequence.organizationId, context.organizationId)
          )
        );
      const [journalSequence] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(
          and(
            eq(numberSequence.entityType, "journal_entry"),
            eq(numberSequence.organizationId, context.organizationId)
          )
        );

      expect(salesSequence?.nextNumber).toBe(2n);
      expect(journalSequence?.nextNumber).toBe(2n);

      const lines = await integrationDb
        .select({
          accountId: journalLine.accountId,
          creditMinor: journalLine.creditMinor,
          debitMinor: journalLine.debitMinor
        })
        .from(journalLine)
        .where(
          and(
            eq(journalLine.journalEntryId, posted.journalEntryId),
            eq(journalLine.organizationId, context.organizationId)
          )
        );

      expect(lines).toEqual(
        expect.arrayContaining([
          { accountId: context.accountsReceivableAccountId, creditMinor: 0n, debitMinor: 15000n },
          { accountId: context.salesAccountId, creditMinor: 15000n, debitMinor: 0n }
        ])
      );
    } finally {
      await context.cleanup();
    }
  });

  it("posts received settlements and reduces allocated invoice outstanding", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(draft, context);

      const settlementDraft = await createSettlementDraft(integrationDb, {
        allocations: [
          {
            amountMinor: "4000",
            targetDocumentId: draft.id,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "4000",
        cashAccountId: context.bankAccountId,
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-16",
        userId: context.userId
      });
      const postedSettlement = await postSettlementDraft(settlementDraft, context);

      const [invoice] = await integrationDb
        .select({ outstandingMinor: salesDocument.outstandingMinor })
        .from(salesDocument)
        .where(eq(salesDocument.id, draft.id));
      const [settlement] = await integrationDb
        .select({ documentNumber: settlementDocument.documentNumber })
        .from(settlementDocument)
        .where(eq(settlementDocument.id, settlementDraft.id));

      expect(postedSettlement).toMatchObject({
        documentKind: "settlement",
        documentNumber: "RCT-25-26-000001"
      });
      expect(settlement?.documentNumber).toBe("RCT-25-26-000001");
      expect(invoice?.outstandingMinor).toBe(6000n);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects voiding allocated sales invoices through guarded update", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(draft, context);

      const settlementDraft = await createSettlementDraft(integrationDb, {
        allocations: [
          {
            amountMinor: "4000",
            targetDocumentId: draft.id,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "4000",
        cashAccountId: context.bankAccountId,
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-16",
        userId: context.userId
      });
      await postSettlementDraft(settlementDraft, context);

      await expect(
        voidSalesDocument(integrationDb, {
          documentId: draft.id,
          organizationId: context.organizationId,
          reason: "Wrong customer",
          userId: context.userId,
          voidDate: "2025-04-17"
        })
      ).rejects.toThrow("DOCUMENT_NOT_FOUND");
    } finally {
      await context.cleanup();
    }
  });

  it("posts purchase bills through accounts payable", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "12000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-17",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId,
        vendorReferenceNumber: "BILL-42"
      });
      const posted = await postPurchaseDraft(draft, context);

      const [bill] = await integrationDb
        .select({
          documentNumber: purchaseDocument.documentNumber,
          outstandingMinor: purchaseDocument.outstandingMinor
        })
        .from(purchaseDocument)
        .where(eq(purchaseDocument.id, draft.id));
      const lines = await integrationDb
        .select({
          accountId: journalLine.accountId,
          creditMinor: journalLine.creditMinor,
          debitMinor: journalLine.debitMinor
        })
        .from(journalLine)
        .where(
          and(
            eq(journalLine.journalEntryId, posted.journalEntryId),
            eq(journalLine.organizationId, context.organizationId)
          )
        );

      expect(posted).toMatchObject({
        documentKind: "purchase_bill",
        documentNumber: "BILL-25-26-000001"
      });
      expect(bill).toEqual({
        documentNumber: "BILL-25-26-000001",
        outstandingMinor: 12000n
      });
      expect(lines).toEqual(
        expect.arrayContaining([
          { accountId: context.generalExpensesAccountId, creditMinor: 0n, debitMinor: 12000n },
          { accountId: context.accountsPayableAccountId, creditMinor: 12000n, debitMinor: 0n }
        ])
      );
    } finally {
      await context.cleanup();
    }
  });

  it("allows changing a purchase draft between bill and expense", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "12000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-17",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId,
        vendorReferenceNumber: "BILL-42"
      });

      const updated = await updatePurchaseDocumentDraft(integrationDb, {
        documentId: draft.id,
        documentKind: "expense",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "12000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-17",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId,
        vendorReferenceNumber: "BILL-42"
      });

      expect(updated.documentKind).toBe("expense");
    } finally {
      await context.cleanup();
    }
  });

  it("voids posted documents through journal reversal", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      const posted = await postSalesDraft(draft, context);
      await expect(
        voidSalesDocument(integrationDb, {
          documentId: draft.id,
          organizationId: context.organizationId,
          reason: "Wrong customer",
          userId: context.userId,
          voidDate: "2025-04-14"
        })
      ).rejects.toThrow("DOCUMENT_DATE_INVALID");

      const voided = await voidSalesDocument(integrationDb, {
        documentId: draft.id,
        organizationId: context.organizationId,
        reason: "Wrong customer",
        userId: context.userId,
        voidDate: "2025-04-16"
      });
      await expect(
        voidSalesDocument(integrationDb, {
          documentId: draft.id,
          organizationId: context.organizationId,
          reason: "Wrong customer",
          userId: context.userId,
          voidDate: "2025-04-16"
        })
      ).rejects.toThrow("DOCUMENT_NOT_FOUND");

      const [originalEntry] = await integrationDb
        .select({ reversalOfEntryId: journalEntry.reversalOfEntryId })
        .from(journalEntry)
        .where(eq(journalEntry.id, posted.journalEntryId));
      const [reversalEntry] = await integrationDb
        .select({ reversalOfEntryId: journalEntry.reversalOfEntryId })
        .from(journalEntry)
        .where(eq(journalEntry.id, voided.reversalJournalEntryId));

      expect(voided).toMatchObject({
        documentKind: "sales_invoice",
        documentNumber: posted.documentNumber,
        journalEntryId: posted.journalEntryId
      });
      expect(originalEntry?.reversalOfEntryId).toBeNull();
      expect(reversalEntry?.reversalOfEntryId).toBe(posted.journalEntryId);
    } finally {
      await context.cleanup();
    }
  });
});

describeDocumentIntegration("document surfaces and review fixes", () => {
  it("paginates sales documents by document-date keyset cursor", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const first = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-10",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      const second = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-11",
        lines: [makeSalesLine(context, "20000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      const third = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-12",
        lines: [makeSalesLine(context, "30000")],
        organizationId: context.organizationId,
        userId: context.userId
      });

      const page1 = await listSalesDocuments(integrationDb, {
        limit: 2,
        organizationId: context.organizationId
      });
      const page2 = await listSalesDocuments(integrationDb, {
        cursor: page1.nextCursor ?? undefined,
        limit: 2,
        organizationId: context.organizationId
      });

      expect(page1.documents.map((document) => document.id)).toEqual([third.id, second.id]);
      expect(page1.nextCursor).toBeTruthy();
      expect(page2.documents.map((document) => document.id)).toEqual([first.id]);
      expect(page2.nextCursor).toBeNull();
    } finally {
      await context.cleanup();
    }
  });

  it("fails fast on invalid document cursors", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      await expect(
        listSalesDocuments(integrationDb, {
          cursor: "bad-cursor",
          organizationId: context.organizationId
        })
      ).rejects.toThrow("CURSOR_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("rejects settlements whose allocations do not equal the settlement amount", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(draft, context);

      await expect(
        createSettlementDraft(integrationDb, {
          allocations: [
            {
              amountMinor: "4000",
              targetDocumentId: draft.id,
              targetDocumentKind: "sales_invoice"
            }
          ],
          amountMinor: "10000",
          cashAccountId: context.bankAccountId,
          direction: "received",
          organizationId: context.organizationId,
          partyId: context.customerPartyId,
          paymentMode: "bank_transfer",
          settlementDate: "2025-04-16",
          userId: context.userId
        })
      ).rejects.toThrow("DOCUMENT_ALLOCATION_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("creates and posts documents with server-generated ids", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const invoiceInput: Parameters<typeof createAndPostSalesDocument>[1] = {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      };
      const invoice = await createAndPostSalesDocument(integrationDb, invoiceInput);
      const billInput: Parameters<typeof createAndPostPurchaseDocument>[1] = {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "12000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-16",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId
      };
      const bill = await createAndPostPurchaseDocument(integrationDb, billInput);
      const receiptInput: Parameters<typeof createAndPostSettlement>[1] = {
        allocations: [
          {
            amountMinor: "4000",
            targetDocumentId: invoice.documentId,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "4000",
        cashAccountId: context.bankAccountId,
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-17",
        userId: context.userId
      };
      const receipt = await createAndPostSettlement(integrationDb, receiptInput);

      expect(invoice.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(bill.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(receipt.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(invoice).toMatchObject({ documentKind: "sales_invoice" });
      expect(bill).toMatchObject({ documentKind: "purchase_bill" });
      expect(receipt).toMatchObject({ documentKind: "settlement" });
    } finally {
      await context.cleanup();
    }
  });

  it("rejects duplicate settlement allocation targets", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(draft, context);

      await expect(
        createSettlementDraft(integrationDb, {
          allocations: [
            {
              amountMinor: "4000",
              targetDocumentId: draft.id,
              targetDocumentKind: "sales_invoice"
            },
            {
              amountMinor: "1000",
              targetDocumentId: draft.id,
              targetDocumentKind: "sales_invoice"
            }
          ],
          amountMinor: "5000",
          cashAccountId: context.bankAccountId,
          direction: "received",
          organizationId: context.organizationId,
          partyId: context.customerPartyId,
          paymentMode: "bank_transfer",
          settlementDate: "2025-04-16",
          userId: context.userId
        })
      ).rejects.toThrow("DOCUMENT_ALLOCATION_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("rejects purchase settlement allocation kind mismatches", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const bill = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "5000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-15",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId
      });
      await postPurchaseDraft(bill, context);

      await expect(
        createSettlementDraft(integrationDb, {
          allocations: [
            {
              amountMinor: "5000",
              targetDocumentId: bill.id,
              targetDocumentKind: "expense"
            }
          ],
          amountMinor: "5000",
          cashAccountId: context.bankAccountId,
          direction: "paid",
          organizationId: context.organizationId,
          partyId: context.vendorPartyId,
          paymentMode: "bank_transfer",
          settlementDate: "2025-04-16",
          userId: context.userId
        })
      ).rejects.toThrow("DOCUMENT_ALLOCATION_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("rejects document posting into wrong account roles", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [
          {
            description: "Consulting",
            incomeAccountId: context.bankAccountId,
            quantity: "1",
            rateMinor: "10000"
          }
        ],
        organizationId: context.organizationId,
        userId: context.userId
      });

      await expect(postSalesDraft(draft, context)).rejects.toThrow("DOCUMENT_ACCOUNT_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("rejects posting into a closed accounting period", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const draft = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await integrationDb
        .update(accountingPeriod)
        .set({ status: "closed" })
        .where(
          and(
            eq(accountingPeriod.organizationId, context.organizationId),
            lte(accountingPeriod.startDate, "2025-04-15"),
            gte(accountingPeriod.endDate, "2025-04-15")
          )
        );

      await expect(postSalesDraft(draft, context)).rejects.toThrow("DOCUMENT_PERIOD_CLOSED");
    } finally {
      await context.cleanup();
    }
  });

  it("lists allocation targets scoped to party, direction, and outstanding balance", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const openInvoice = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(openInvoice, context);

      const settledInvoice = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "5000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(settledInvoice, context);
      const fullSettlement = await createSettlementDraft(integrationDb, {
        allocations: [
          {
            amountMinor: "5000",
            targetDocumentId: settledInvoice.id,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "5000",
        cashAccountId: context.bankAccountId,
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-16",
        userId: context.userId
      });
      await postSettlementDraft(fullSettlement, context);

      const bill = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "12000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-17",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId
      });
      await postPurchaseDraft(bill, context);

      const receivedTargets = await listAllocationTargets(integrationDb, {
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId
      });
      const paidTargets = await listAllocationTargets(integrationDb, {
        direction: "paid",
        organizationId: context.organizationId,
        partyId: context.vendorPartyId
      });

      expect(receivedTargets.targets.map((target) => target.id)).toEqual([openInvoice.id]);
      expect(receivedTargets.targets[0]).toMatchObject({
        documentKind: "sales_invoice",
        outstandingMinor: "10000"
      });
      expect(paidTargets.targets.map((target) => target.id)).toEqual([bill.id]);
      expect(paidTargets.targets[0]).toMatchObject({
        documentKind: "purchase_bill",
        outstandingMinor: "12000"
      });
    } finally {
      await context.cleanup();
    }
  });

  it("rejects settlement allocations against another party's document", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const otherCustomer = await createParty(integrationDb, {
        displayName: "Other Buyer",
        gstRegistrationType: "unregistered",
        kind: "customer",
        organizationId: context.organizationId,
        userId: context.userId
      });
      const otherInvoice = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: otherCustomer.id,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "10000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(otherInvoice, context);

      await expect(
        createSettlementDraft(integrationDb, {
          allocations: [
            {
              amountMinor: "1000",
              targetDocumentId: otherInvoice.id,
              targetDocumentKind: "sales_invoice"
            }
          ],
          amountMinor: "1000",
          cashAccountId: context.bankAccountId,
          direction: "received",
          organizationId: context.organizationId,
          partyId: context.customerPartyId,
          paymentMode: "bank_transfer",
          settlementDate: "2025-04-16",
          userId: context.userId
        })
      ).rejects.toThrow("DOCUMENT_ALLOCATION_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("filters settlements by direction", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const invoice = await createSalesDocumentDraft(integrationDb, {
        customerPartyId: context.customerPartyId,
        invoiceDate: "2025-04-15",
        lines: [makeSalesLine(context, "4000")],
        organizationId: context.organizationId,
        userId: context.userId
      });
      await postSalesDraft(invoice, context);
      const bill = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "purchase_bill",
        lines: [
          {
            description: "Hosting",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "7000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-15",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId
      });
      await postPurchaseDraft(bill, context);

      const receipt = await createSettlementDraft(integrationDb, {
        allocations: [
          {
            amountMinor: "4000",
            targetDocumentId: invoice.id,
            targetDocumentKind: "sales_invoice"
          }
        ],
        amountMinor: "4000",
        cashAccountId: context.bankAccountId,
        direction: "received",
        organizationId: context.organizationId,
        partyId: context.customerPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-16",
        userId: context.userId
      });
      const payment = await createSettlementDraft(integrationDb, {
        allocations: [
          {
            amountMinor: "7000",
            targetDocumentId: bill.id,
            targetDocumentKind: "purchase_bill"
          }
        ],
        amountMinor: "7000",
        cashAccountId: context.bankAccountId,
        direction: "paid",
        organizationId: context.organizationId,
        partyId: context.vendorPartyId,
        paymentMode: "bank_transfer",
        settlementDate: "2025-04-16",
        userId: context.userId
      });

      const received = await listSettlementDocuments(integrationDb, {
        direction: "received",
        organizationId: context.organizationId
      });
      const paid = await listSettlementDocuments(integrationDb, {
        direction: "paid",
        organizationId: context.organizationId
      });

      expect(received.documents.map((document) => document.id)).toEqual([receipt.id]);
      expect(paid.documents.map((document) => document.id)).toEqual([payment.id]);
    } finally {
      await context.cleanup();
    }
  });
});
