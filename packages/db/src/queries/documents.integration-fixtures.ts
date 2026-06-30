import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe } from "vite-plus/test";

import { type Database } from "#@/client";
import { ledgerAccount } from "#@/schema/accounts";
import { organization, user } from "#@/schema/auth.schema";

import { setupOrganizationAccountingDefaults } from "./accounting";
import { createParty } from "./parties";

export const shouldRunDocumentIntegration = process.env.DB_INTEGRATION_TESTS === "1";
export const describeDocumentIntegration = shouldRunDocumentIntegration ? describe : describe.skip;

export type DocumentContext = {
  accountsPayableAccountId: string;
  accountsReceivableAccountId: string;
  bankAccountId: string;
  cleanup: () => Promise<void>;
  customerPartyId: string;
  generalExpensesAccountId: string;
  organizationId: string;
  salesAccountId: string;
  userId: string;
  vendorPartyId: string;
};

export async function loadDocumentIntegrationDb(): Promise<{
  closeIntegrationDb?: () => Promise<void>;
  integrationDb: Database;
}> {
  const client = await import("#@/client");

  return {
    closeIntegrationDb: client.closeDb,
    integrationDb: client.db
  };
}

export async function createDocumentContext(integrationDb: Database): Promise<DocumentContext> {
  const testId = randomUUID();
  const userId = `test_user_${testId}`;
  const organizationId = `test_org_${testId}`;

  await integrationDb.insert(user).values({
    email: `documents-${testId}@example.test`,
    emailVerified: true,
    id: userId,
    name: "Documents Integration Test"
  });

  await integrationDb.insert(organization).values({
    createdAt: new Date(),
    id: organizationId,
    name: "Documents Integration Test",
    slug: `documents-${testId}`
  });

  await integrationDb.transaction((tx) =>
    setupOrganizationAccountingDefaults(tx, {
      booksStartDate: "2025-04-01",
      initialFiscalYearEndDate: "2026-03-31",
      organizationId,
      userId
    })
  );

  const accounts = await integrationDb
    .select({ id: ledgerAccount.id, systemKey: ledgerAccount.systemKey })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.organizationId, organizationId));
  const accountIdBySystemKey = new Map(accounts.map((account) => [account.systemKey, account.id]));
  const customer = await createParty(integrationDb, {
    displayName: "Acme Traders",
    gstRegistrationType: "unregistered",
    kind: "customer",
    organizationId,
    userId
  });
  const vendor = await createParty(integrationDb, {
    displayName: "Cloud Host",
    gstRegistrationType: "unregistered",
    kind: "vendor",
    organizationId,
    userId
  });

  return {
    accountsPayableAccountId: mustGet(accountIdBySystemKey, "accounts_payable"),
    accountsReceivableAccountId: mustGet(accountIdBySystemKey, "accounts_receivable"),
    bankAccountId: mustGet(accountIdBySystemKey, "bank"),
    cleanup: async () => {
      await integrationDb.delete(organization).where(eq(organization.id, organizationId));
      await integrationDb.delete(user).where(eq(user.id, userId));
    },
    customerPartyId: customer.id,
    generalExpensesAccountId: mustGet(accountIdBySystemKey, "general_expenses"),
    organizationId,
    salesAccountId: mustGet(accountIdBySystemKey, "sales"),
    userId,
    vendorPartyId: vendor.id
  };
}

export function makeSalesLine(context: DocumentContext, rateMinor: string) {
  return {
    description: "Consulting",
    incomeAccountId: context.salesAccountId,
    quantity: "1",
    rateMinor
  };
}

function mustGet(map: Map<string | null, string>, key: string): string {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Missing account ${key}`);
  }

  return value;
}
