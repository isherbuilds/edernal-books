import { afterAll, beforeAll, expect, it } from "vite-plus/test";

import { type Database } from "#@/client";

import { createPurchaseDocumentDraft, listPurchaseDocuments } from "./documents";
import {
  createDocumentContext,
  describeDocumentIntegration,
  loadDocumentIntegrationDb,
  shouldRunDocumentIntegration
} from "./documents.integration-fixtures";

let integrationDb: Database;
let closeIntegrationDb: (() => Promise<void>) | undefined;

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

describeDocumentIntegration("document purchase register integration", () => {
  it("lists purchase documents filtered by kind", async () => {
    const context = await createDocumentContext(integrationDb);

    try {
      const purchaseBill = await createPurchaseDocumentDraft(integrationDb, {
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
      const expense = await createPurchaseDocumentDraft(integrationDb, {
        documentKind: "expense",
        lines: [
          {
            description: "Travel",
            expenseAccountId: context.generalExpensesAccountId,
            quantity: "1",
            rateMinor: "3000"
          }
        ],
        organizationId: context.organizationId,
        purchaseDate: "2025-04-17",
        userId: context.userId,
        vendorPartyId: context.vendorPartyId
      });

      const billsOnly = await listPurchaseDocuments(integrationDb, {
        documentKind: "purchase_bill",
        organizationId: context.organizationId
      });
      const both = await listPurchaseDocuments(integrationDb, {
        organizationId: context.organizationId
      });

      expect(billsOnly.documents.map((document) => document.id)).toEqual([purchaseBill.id]);
      expect(both.documents.map((document) => document.id)).toEqual([expense.id, purchaseBill.id]);
    } finally {
      await context.cleanup();
    }
  });
});
