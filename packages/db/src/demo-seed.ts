import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { formatSequenceNumber, type JournalSourceType } from "@tsu-stack/core/accounting";
import { createLogger } from "@tsu-stack/logger/server";

import { closeDb, db, type TransactionClient } from "#@/client";
import { setupOrganizationAccountingDefaults } from "#@/queries/accounting";
import { seedSupportedCurrencies } from "#@/queries/currency";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { auditEvent as auditEventTable } from "#@/schema/audit";
import { account, member, organization, session, user } from "#@/schema/auth.schema";
import {
  purchaseDocument as purchaseDocumentTable,
  purchaseDocumentLine as purchaseDocumentLineTable,
  salesDocument as salesDocumentTable,
  salesDocumentLine as salesDocumentLineTable,
  settlementAllocation as settlementAllocationTable,
  settlementDocument as settlementDocumentTable
} from "#@/schema/documents";
import { item as itemTable } from "#@/schema/items";
import {
  journalEntry as journalEntryTable,
  journalLine as journalLineTable
} from "#@/schema/journal";
import { organizationSetting } from "#@/schema/organization";
import { party as partyTable } from "#@/schema/parties";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";
import { createUuidV7 } from "#@/utils/id";

const DEMO_USER_ID = "demo-owner-user";
const DEMO_USER_EMAIL = "owner@demo.edernal.local";
const DEMO_USER_PASSWORD = "DemoPass123!";
const DEMO_ORG_ID = "demo-edernal-corp";
const DEMO_ORG_SLUG = "edernal-demo-corp";
const DEMO_SESSION_TOKEN = "demo-session-token";
const BOOKS_START_DATE = "2026-04-01";
const FISCAL_YEAR_END_DATE = "2027-03-31";
const BATCH_SIZE = 1_000;
const cities = ["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai"];
const states = ["Maharashtra", "Karnataka", "Delhi", "Maharashtra", "Telangana", "Tamil Nadu"];

type AuditEventInsert = typeof auditEventTable.$inferInsert;
type ItemInsert = typeof itemTable.$inferInsert;
type JournalEntryInsert = typeof journalEntryTable.$inferInsert;
type JournalLineInsert = typeof journalLineTable.$inferInsert;
type PartyInsert = typeof partyTable.$inferInsert;
type PurchaseDocumentInsert = typeof purchaseDocumentTable.$inferInsert;
type PurchaseDocumentLineInsert = typeof purchaseDocumentLineTable.$inferInsert;
type SalesDocumentInsert = typeof salesDocumentTable.$inferInsert;
type SalesDocumentLineInsert = typeof salesDocumentLineTable.$inferInsert;
type SettlementAllocationInsert = typeof settlementAllocationTable.$inferInsert;
type SettlementDocumentInsert = typeof settlementDocumentTable.$inferInsert;
type SeededItem = ItemInsert & { hsnCode: string; id: string; name: string; unit: string };
type SeededParty = PartyInsert & { id: string };

type PeriodRange = {
  endDate: string;
  id: string;
  startDate: string;
};

type SequenceState = {
  entityType: string;
  fiscalYearId: string;
  nextNumber: bigint;
  padding: number;
  prefix: string;
  suffix: string;
};

type Accounts = {
  accountsPayable: string;
  accountsReceivable: string;
  bank: string;
  cash: string;
  generalExpenses: string;
  ownersEquity: string;
  purchases: string;
  sales: string;
};

type SalesTarget = {
  amountMinor: bigint;
  date: string;
  documentId: string;
  documentNumber: string;
  partyId: string;
};

type PurchaseTarget = SalesTarget & {
  documentKind: "expense" | "purchase_bill";
};

await main();

async function main() {
  const logger = createLogger({ operation: "database__demo_seed" });

  try {
    assertLocalDatabase();

    const totalTransactionCount = readTransactionCount();
    await seedSupportedCurrencies(db);

    const summary = await db.transaction(async (tx) => {
      await clearDemoTenant(tx);
      await createDemoTenant(tx);

      await setupOrganizationAccountingDefaults(tx, {
        booksStartDate: BOOKS_START_DATE,
        initialFiscalYearEndDate: FISCAL_YEAR_END_DATE,
        organizationId: DEMO_ORG_ID,
        userId: DEMO_USER_ID
      });

      const fiscalYearId = await loadFiscalYearId(tx);
      const accounts = await loadAccounts(tx);
      const periods = await loadPeriods(tx, fiscalYearId);
      const sequences = await loadSequences(tx, fiscalYearId);
      const parties = await seedParties(tx);
      const items = await seedItems(tx, accounts);

      const counts = splitTransactionCount(totalTransactionCount);
      const salesTargets = await seedSalesDocuments(tx, {
        accounts,
        allocatedCount: counts.receipts,
        count: counts.salesInvoices,
        items,
        parties,
        periods,
        sequences
      });
      const purchaseTargets = await seedPurchaseDocuments(tx, {
        accounts,
        allocatedCount: counts.payments,
        count: counts.purchaseDocuments,
        items,
        parties,
        periods,
        sequences
      });

      await seedSettlementDocuments(tx, {
        accounts,
        periods,
        purchaseTargets,
        salesTargets,
        sequences
      });

      await seedDraftAndVoidedDocuments(tx, {
        accounts,
        items,
        parties,
        periods,
        purchaseTargets,
        salesTargets,
        sequences
      });

      await seedManualJournals(tx, { accounts, periods, sequences });
      await persistSequences(tx, sequences);

      return {
        ...counts,
        manualJournals: 50,
        parties: parties.customers.length + parties.vendors.length,
        items: items.length
      };
    });

    logger.emit({
      demoEmail: DEMO_USER_EMAIL,
      event: "demo_seed_completed",
      organizationSlug: DEMO_ORG_SLUG,
      summary
    });
  } finally {
    await closeDb();
  }
}

function assertLocalDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const localHosts = new Set(["127.0.0.1", "::1", "localhost", "postgres"]);

  if (!localHosts.has(url.hostname)) {
    throw new Error(`Refusing demo seed against non-local database host: ${url.hostname}`);
  }
}

function readTransactionCount(): number {
  const raw = process.env.DEMO_TRANSACTION_COUNT ?? "100000";

  if (!/^\d+$/.test(raw)) {
    throw new Error("DEMO_TRANSACTION_COUNT must be an integer >= 100");
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 100) {
    throw new Error("DEMO_TRANSACTION_COUNT must be an integer >= 100");
  }

  return parsed;
}

function splitTransactionCount(total: number) {
  const salesInvoices = Math.floor(total * 0.35);
  const purchaseDocuments = Math.floor(total * 0.25);
  const receipts = Math.min(Math.floor(total * 0.2), salesInvoices);
  const payments = total - salesInvoices - purchaseDocuments - receipts;

  if (payments > purchaseDocuments) {
    throw new Error("Transaction split produced more payments than purchase documents");
  }

  return { payments, purchaseDocuments, receipts, salesInvoices };
}

async function clearDemoTenant(tx: TransactionClient) {
  const [existingOrg] = await tx
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, DEMO_ORG_SLUG))
    .limit(1);
  const [existingUser] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_USER_EMAIL))
    .limit(1);

  if (existingOrg) {
    const organizationId = existingOrg.id;

    await tx
      .delete(settlementAllocationTable)
      .where(eq(settlementAllocationTable.organizationId, organizationId));
    await tx
      .delete(salesDocumentLineTable)
      .where(eq(salesDocumentLineTable.organizationId, organizationId));
    await tx
      .delete(purchaseDocumentLineTable)
      .where(eq(purchaseDocumentLineTable.organizationId, organizationId));
    await tx
      .delete(settlementDocumentTable)
      .where(eq(settlementDocumentTable.organizationId, organizationId));
    await tx
      .delete(salesDocumentTable)
      .where(eq(salesDocumentTable.organizationId, organizationId));
    await tx
      .delete(purchaseDocumentTable)
      .where(eq(purchaseDocumentTable.organizationId, organizationId));
    await tx.delete(journalLineTable).where(eq(journalLineTable.organizationId, organizationId));
    await tx.delete(journalEntryTable).where(eq(journalEntryTable.organizationId, organizationId));
    await tx.delete(auditEventTable).where(eq(auditEventTable.organizationId, organizationId));
    await tx.delete(itemTable).where(eq(itemTable.organizationId, organizationId));
    await tx.delete(partyTable).where(eq(partyTable.organizationId, organizationId));
    await tx.delete(ledgerAccount).where(eq(ledgerAccount.organizationId, organizationId));
    await tx.delete(numberSequence).where(eq(numberSequence.organizationId, organizationId));
    await tx.delete(accountingPeriod).where(eq(accountingPeriod.organizationId, organizationId));
    await tx.delete(fiscalYear).where(eq(fiscalYear.organizationId, organizationId));
    await tx
      .delete(organizationSetting)
      .where(eq(organizationSetting.organizationId, organizationId));
    await tx.delete(member).where(eq(member.organizationId, organizationId));
    await tx.delete(session).where(eq(session.activeOrganizationId, organizationId));
    await tx.delete(organization).where(eq(organization.id, organizationId));
  }

  if (existingUser) {
    await tx.delete(session).where(eq(session.userId, existingUser.id));
    await tx.delete(account).where(eq(account.userId, existingUser.id));
    await tx.delete(member).where(eq(member.userId, existingUser.id));
    await tx.delete(user).where(eq(user.id, existingUser.id));
  }
}

async function createDemoTenant(tx: TransactionClient) {
  const now = new Date();

  await tx.insert(user).values({
    createdAt: now,
    email: DEMO_USER_EMAIL,
    emailVerified: true,
    id: DEMO_USER_ID,
    image: null,
    name: "Demo Owner",
    updatedAt: now
  });
  await tx.insert(account).values({
    accountId: DEMO_USER_ID,
    createdAt: now,
    id: "demo-owner-credential-account",
    password: await hashPassword(DEMO_USER_PASSWORD),
    providerId: "credential",
    updatedAt: now,
    userId: DEMO_USER_ID
  });
  await tx.insert(organization).values({
    createdAt: now,
    id: DEMO_ORG_ID,
    logo: null,
    metadata: null,
    name: "Edernal Demo Corporation",
    onboardingCompletedAt: now,
    slug: DEMO_ORG_SLUG
  });
  await tx.insert(member).values({
    createdAt: now,
    id: "demo-owner-member",
    organizationId: DEMO_ORG_ID,
    role: "owner",
    userId: DEMO_USER_ID
  });
  await tx.insert(session).values({
    activeOrganizationId: DEMO_ORG_ID,
    createdAt: now,
    expiresAt: addDays(now, 30),
    id: "demo-owner-session",
    ipAddress: "127.0.0.1",
    token: DEMO_SESSION_TOKEN,
    updatedAt: now,
    userAgent: "demo-seed",
    userId: DEMO_USER_ID
  });
  await tx.insert(organizationSetting).values({
    baseCurrencyCode: "INR",
    booksStartDate: BOOKS_START_DATE,
    countryCode: "IN",
    createdAt: now,
    fiscalYearStartMonth: 4,
    legalName: "Edernal Demo Corporation Private Limited",
    organizationId: DEMO_ORG_ID,
    primaryEmail: "finance@demo.edernal.local",
    primaryPhone: "+91 98765 43210",
    timezone: "Asia/Kolkata",
    tradeName: "Edernal Demo Corp",
    updatedAt: now
  });
}

async function loadAccounts(tx: TransactionClient): Promise<Accounts> {
  const rows = await tx
    .select({ id: ledgerAccount.id, systemKey: ledgerAccount.systemKey })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.organizationId, DEMO_ORG_ID));
  const byKey = new Map(rows.map((row) => [row.systemKey, row.id]));

  return {
    accountsPayable: requireAccount(byKey, "accounts_payable"),
    accountsReceivable: requireAccount(byKey, "accounts_receivable"),
    bank: requireAccount(byKey, "bank"),
    cash: requireAccount(byKey, "cash"),
    generalExpenses: requireAccount(byKey, "general_expenses"),
    ownersEquity: requireAccount(byKey, "owners_equity"),
    purchases: requireAccount(byKey, "purchases"),
    sales: requireAccount(byKey, "sales")
  };
}

async function loadFiscalYearId(tx: TransactionClient): Promise<string> {
  const [row] = await tx
    .select({ id: fiscalYear.id })
    .from(fiscalYear)
    .where(
      and(eq(fiscalYear.organizationId, DEMO_ORG_ID), eq(fiscalYear.startDate, BOOKS_START_DATE))
    )
    .limit(1);

  if (!row) {
    throw new Error(`Missing demo fiscal year for ${BOOKS_START_DATE}`);
  }

  return row.id;
}

function requireAccount(accounts: Map<string | null, string>, systemKey: string): string {
  const accountId = accounts.get(systemKey);

  if (!accountId) {
    throw new Error(`Missing default ledger account: ${systemKey}`);
  }

  return accountId;
}

async function loadPeriods(tx: TransactionClient, fiscalYearId: string): Promise<PeriodRange[]> {
  return tx
    .select({
      endDate: accountingPeriod.endDate,
      id: accountingPeriod.id,
      startDate: accountingPeriod.startDate
    })
    .from(accountingPeriod)
    .where(
      and(
        eq(accountingPeriod.organizationId, DEMO_ORG_ID),
        eq(accountingPeriod.fiscalYearId, fiscalYearId)
      )
    )
    .orderBy(accountingPeriod.startDate);
}

async function loadSequences(
  tx: TransactionClient,
  fiscalYearId: string
): Promise<Map<string, SequenceState>> {
  const rows = await tx
    .select({
      entityType: numberSequence.entityType,
      fiscalYearId: numberSequence.fiscalYearId,
      nextNumber: numberSequence.nextNumber,
      padding: numberSequence.padding,
      prefix: numberSequence.prefix,
      suffix: numberSequence.suffix
    })
    .from(numberSequence)
    .where(
      and(
        eq(numberSequence.organizationId, DEMO_ORG_ID),
        eq(numberSequence.fiscalYearId, fiscalYearId)
      )
    );

  return new Map(rows.map((row) => [row.entityType, { ...row }]));
}

async function seedParties(tx: TransactionClient) {
  const customers: SeededParty[] = [];
  const vendors: SeededParty[] = [];

  for (let index = 0; index < 250; index += 1) {
    const name = `Demo Customer ${String(index + 1).padStart(3, "0")}`;
    customers.push({
      addressLine1: `${index + 11} Finance Park`,
      addressLine2: null,
      city: atModulo(cities, index),
      countryCode: "IN",
      displayName: name,
      email: `customer${index + 1}@demo.edernal.local`,
      gstRegistrationType: index % 3 === 0 ? "registered_regular" : "unregistered",
      gstin: index % 3 === 0 ? makeGstin(index) : null,
      id: createUuidV7(),
      isActive: true,
      kind: "customer",
      legalName: `${name} Private Limited`,
      normalizedName: normalizeName(name),
      organizationId: DEMO_ORG_ID,
      pan: makePan(index),
      phone: `+91 98${String(70000000 + index).padStart(8, "0")}`,
      postalCode: String(400001 + (index % 200)),
      state: atModulo(states, index)
    });
  }

  for (let index = 0; index < 120; index += 1) {
    const name = `Demo Vendor ${String(index + 1).padStart(3, "0")}`;
    vendors.push({
      addressLine1: `${index + 21} Industrial Estate`,
      addressLine2: null,
      city: atModulo(cities, index + 2),
      countryCode: "IN",
      displayName: name,
      email: `vendor${index + 1}@demo.edernal.local`,
      gstRegistrationType: index % 2 === 0 ? "registered_regular" : "unregistered",
      gstin: index % 2 === 0 ? makeGstin(index + 500) : null,
      id: createUuidV7(),
      isActive: true,
      kind: "vendor",
      legalName: `${name} LLP`,
      normalizedName: normalizeName(name),
      organizationId: DEMO_ORG_ID,
      pan: makePan(index + 500),
      phone: `+91 97${String(60000000 + index).padStart(8, "0")}`,
      postalCode: String(560001 + (index % 200)),
      state: atModulo(states, index + 2)
    });
  }

  await insertPartyRows(tx, [...customers, ...vendors]);

  return { customers, vendors };
}

async function seedItems(tx: TransactionClient, accounts: Accounts): Promise<SeededItem[]> {
  const rows: SeededItem[] = [];

  for (let index = 0; index < 160; index += 1) {
    const isService = index % 4 !== 0;
    const name = isService
      ? `Managed Service Plan ${String(index + 1).padStart(3, "0")}`
      : `Hardware Bundle ${String(index + 1).padStart(3, "0")}`;

    rows.push({
      description: isService ? "Recurring service revenue item" : "Procured hardware resale item",
      expenseAccountId: accounts.purchases,
      hsnCode: isService ? "998314" : "847130",
      id: createUuidV7(),
      isActive: true,
      kind: isService ? "service" : "goods",
      name,
      normalizedName: normalizeName(name),
      organizationId: DEMO_ORG_ID,
      purchaseRateMinor: BigInt(80_000 + index * 121),
      salesAccountId: accounts.sales,
      salesRateMinor: BigInt(125_000 + index * 173),
      unit: isService ? "month" : "unit",
      usage: "both"
    });
  }

  await insertItemRows(tx, rows);

  return rows;
}

async function seedSalesDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    allocatedCount: number;
    count: number;
    items: SeededItem[];
    parties: { customers: SeededParty[] };
    periods: PeriodRange[];
    sequences: Map<string, SequenceState>;
  }
): Promise<SalesTarget[]> {
  const targets: SalesTarget[] = [];
  const documents: SalesDocumentInsert[] = [];
  const lines: SalesDocumentLineInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < input.count; index += 1) {
    const documentId = createUuidV7();
    const journalEntryId = createUuidV7();
    const invoiceDate = dateForIndex(index);
    const amountMinor = BigInt(25_000 + (index % 500) * 1_337);
    const documentNumber = takeSequence(input.sequences, "sales_invoice");
    const entryNumber = takeSequence(input.sequences, "journal_entry");
    const customer = atModulo(input.parties.customers, index);
    const selectedItem = atModulo(input.items, index);
    const isAllocated = index < input.allocatedCount;
    const periodId = periodForDate(input.periods, invoiceDate);
    const postedAt = timestampForIndex(index);

    documents.push({
      customerPartyId: customer.id,
      documentNumber,
      draftReference: `sales-${documentId}`,
      dueDate: addIsoDays(invoiceDate, 30),
      id: documentId,
      invoiceDate,
      journalEntryId,
      notes: "Demo posted sales invoice",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: isAllocated ? 0n : amountMinor,
      postedAt,
      postedByUserId: DEMO_USER_ID,
      status: "posted",
      terms: "Net 30",
      totalMinor: amountMinor
    });
    lines.push({
      description: selectedItem.name,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      incomeAccountId: input.accounts.sales,
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      quantity: "1.000000",
      rateMinor: amountMinor,
      salesDocumentId: documentId,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date: invoiceDate,
        description: `Sales invoice ${documentNumber}`,
        entryNumber,
        id: journalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: documentId,
        sourceType: "sales_invoice",
        totalMinor: amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId: input.accounts.accountsReceivable,
        debitMinor: amountMinor,
        description: `Accounts receivable ${documentNumber}`,
        journalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.sales,
        creditMinor: amountMinor,
        description: `Sales ${documentNumber}`,
        journalEntryId,
        lineNumber: 2
      })
    );
    audits.push(makeAudit("sales_document", documentId, "sales_document.posted", documentNumber));

    if (isAllocated) {
      targets.push({
        amountMinor,
        date: invoiceDate,
        documentId,
        documentNumber,
        partyId: customer.id
      });
    }

    if (documents.length === BATCH_SIZE) {
      await flushTradeDocumentRows(tx, {
        audits,
        documents,
        entries,
        journalLines,
        lines,
        type: "sales"
      });
    }
  }

  await flushTradeDocumentRows(tx, {
    audits,
    documents,
    entries,
    journalLines,
    lines,
    type: "sales"
  });

  return targets;
}

async function seedPurchaseDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    allocatedCount: number;
    count: number;
    items: SeededItem[];
    parties: { vendors: SeededParty[] };
    periods: PeriodRange[];
    sequences: Map<string, SequenceState>;
  }
): Promise<PurchaseTarget[]> {
  const targets: PurchaseTarget[] = [];
  const documents: PurchaseDocumentInsert[] = [];
  const lines: PurchaseDocumentLineInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < input.count; index += 1) {
    const documentKind = index % 5 === 0 ? "expense" : "purchase_bill";
    const documentId = createUuidV7();
    const journalEntryId = createUuidV7();
    const purchaseDate = dateForIndex(index + 19);
    const amountMinor = BigInt(12_000 + (index % 420) * 977);
    const sequenceType: JournalSourceType = documentKind;
    const documentNumber = takeSequence(input.sequences, sequenceType);
    const entryNumber = takeSequence(input.sequences, "journal_entry");
    const vendor = atModulo(input.parties.vendors, index);
    const selectedItem = atModulo(input.items, index + 7);
    const isAllocated = index < input.allocatedCount;
    const periodId = periodForDate(input.periods, purchaseDate);
    const postedAt = timestampForIndex(index + 9);

    documents.push({
      documentKind,
      documentNumber,
      draftReference: `purchase-${documentId}`,
      dueDate: addIsoDays(purchaseDate, 20),
      id: documentId,
      journalEntryId,
      notes: "Demo posted purchase document",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: isAllocated ? 0n : amountMinor,
      postedAt,
      postedByUserId: DEMO_USER_ID,
      purchaseDate,
      status: "posted",
      totalMinor: amountMinor,
      vendorPartyId: vendor.id,
      vendorReferenceNumber: `VR-${String(index + 1).padStart(6, "0")}`
    });
    lines.push({
      description: selectedItem.name,
      expenseAccountId:
        documentKind === "expense" ? input.accounts.generalExpenses : input.accounts.purchases,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      purchaseDocumentId: documentId,
      quantity: "1.000000",
      rateMinor: amountMinor,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date: purchaseDate,
        description: `Purchase document ${documentNumber}`,
        entryNumber,
        id: journalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: documentId,
        sourceType: sequenceType,
        totalMinor: amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId:
          documentKind === "expense" ? input.accounts.generalExpenses : input.accounts.purchases,
        debitMinor: amountMinor,
        description: `Purchase ${documentNumber}`,
        journalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.accountsPayable,
        creditMinor: amountMinor,
        description: `Accounts payable ${documentNumber}`,
        journalEntryId,
        lineNumber: 2
      })
    );
    audits.push(
      makeAudit("purchase_document", documentId, "purchase_document.posted", documentNumber)
    );

    if (isAllocated) {
      targets.push({
        amountMinor,
        date: purchaseDate,
        documentId,
        documentKind,
        documentNumber,
        partyId: vendor.id
      });
    }

    if (documents.length === BATCH_SIZE) {
      await flushTradeDocumentRows(tx, {
        audits,
        documents,
        entries,
        journalLines,
        lines,
        type: "purchase"
      });
    }
  }

  await flushTradeDocumentRows(tx, {
    audits,
    documents,
    entries,
    journalLines,
    lines,
    type: "purchase"
  });

  return targets;
}

async function seedSettlementDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    periods: PeriodRange[];
    purchaseTargets: PurchaseTarget[];
    salesTargets: SalesTarget[];
    sequences: Map<string, SequenceState>;
  }
) {
  await seedSettlementDirection(tx, {
    accountDebit: input.accounts.bank,
    accountCredit: input.accounts.accountsReceivable,
    direction: "received",
    periods: input.periods,
    sequenceType: "settlement_received",
    sequences: input.sequences,
    targets: input.salesTargets
  });
  await seedSettlementDirection(tx, {
    accountDebit: input.accounts.accountsPayable,
    accountCredit: input.accounts.bank,
    direction: "paid",
    periods: input.periods,
    sequenceType: "settlement_paid",
    sequences: input.sequences,
    targets: input.purchaseTargets
  });
}

async function seedSettlementDirection(
  tx: TransactionClient,
  input: {
    accountCredit: string;
    accountDebit: string;
    direction: "paid" | "received";
    periods: PeriodRange[];
    sequenceType: "settlement_paid" | "settlement_received";
    sequences: Map<string, SequenceState>;
    targets: ReadonlyArray<PurchaseTarget | SalesTarget>;
  }
) {
  const documents: SettlementDocumentInsert[] = [];
  const allocations: SettlementAllocationInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < input.targets.length; index += 1) {
    const target = input.targets[index];
    const documentId = createUuidV7();
    const journalEntryId = createUuidV7();
    const settlementDate = minIsoDate(addIsoDays(target.date, 5), FISCAL_YEAR_END_DATE);
    const documentNumber = takeSequence(input.sequences, input.sequenceType);
    const entryNumber = takeSequence(input.sequences, "journal_entry");
    const periodId = periodForDate(input.periods, settlementDate);

    documents.push({
      amountMinor: target.amountMinor,
      cashAccountId: input.direction === "received" ? input.accountDebit : input.accountCredit,
      direction: input.direction,
      documentNumber,
      draftReference: `settlement-${documentId}`,
      id: documentId,
      journalEntryId,
      notes: `Demo ${input.direction === "received" ? "receipt" : "payment"}`,
      organizationId: DEMO_ORG_ID,
      partyId: target.partyId,
      paymentMode: index % 4 === 0 ? "upi" : "bank_transfer",
      postedAt: timestampForIndex(index + 29),
      postedByUserId: DEMO_USER_ID,
      reference: `UTR${String(index + 1).padStart(10, "0")}`,
      settlementDate,
      status: "posted"
    });
    allocations.push({
      amountMinor: target.amountMinor,
      id: createUuidV7(),
      organizationId: DEMO_ORG_ID,
      purchaseDocumentId: "documentKind" in target ? target.documentId : null,
      salesDocumentId: "documentKind" in target ? null : target.documentId,
      settlementDocumentId: documentId,
      targetDocumentKind: "documentKind" in target ? target.documentKind : "sales_invoice"
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date: settlementDate,
        description: `${input.direction === "received" ? "Receipt" : "Payment"} ${documentNumber}`,
        entryNumber,
        id: journalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: documentId,
        sourceType: input.sequenceType,
        totalMinor: target.amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId: input.accountDebit,
        debitMinor: target.amountMinor,
        description: documentNumber,
        journalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accountCredit,
        creditMinor: target.amountMinor,
        description: documentNumber,
        journalEntryId,
        lineNumber: 2
      })
    );
    audits.push(
      makeAudit("settlement_document", documentId, "settlement_document.posted", documentNumber)
    );

    if (documents.length === BATCH_SIZE) {
      await flushSettlementRows(tx, { allocations, audits, documents, entries, journalLines });
    }
  }

  await flushSettlementRows(tx, { allocations, audits, documents, entries, journalLines });
}

async function seedDraftAndVoidedDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    items: SeededItem[];
    parties: { customers: SeededParty[]; vendors: SeededParty[] };
    periods: PeriodRange[];
    purchaseTargets: PurchaseTarget[];
    salesTargets: SalesTarget[];
    sequences: Map<string, SequenceState>;
  }
) {
  const drafts = 50;
  const salesDocuments: SalesDocumentInsert[] = [];
  const salesLines: SalesDocumentLineInsert[] = [];
  const purchaseDocuments: PurchaseDocumentInsert[] = [];
  const purchaseLines: PurchaseDocumentLineInsert[] = [];
  const settlementDocuments: SettlementDocumentInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < drafts; index += 1) {
    const salesId = createUuidV7();
    const purchaseId = createUuidV7();
    const settlementId = createUuidV7();
    const date = dateForIndex(index + 231);
    const selectedItem = atModulo(input.items, index);
    const customer = atModulo(input.parties.customers, index + 3);
    const vendor = atModulo(input.parties.vendors, index + 5);
    const amountMinor = BigInt(18_000 + index * 101);

    salesDocuments.push({
      customerPartyId: customer.id,
      documentNumber: null,
      draftReference: `draft-sales-${salesId}`,
      dueDate: addIsoDays(date, 30),
      id: salesId,
      invoiceDate: date,
      journalEntryId: null,
      notes: "Demo draft invoice",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: amountMinor,
      postedAt: null,
      postedByUserId: null,
      status: "draft",
      terms: "Net 30",
      totalMinor: amountMinor
    });
    salesLines.push({
      description: selectedItem.name,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      incomeAccountId: input.accounts.sales,
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      quantity: "1.000000",
      rateMinor: amountMinor,
      salesDocumentId: salesId,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });

    purchaseDocuments.push({
      documentKind: "purchase_bill",
      documentNumber: null,
      draftReference: `draft-purchase-${purchaseId}`,
      dueDate: addIsoDays(date, 20),
      id: purchaseId,
      journalEntryId: null,
      notes: "Demo draft bill",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: amountMinor,
      postedAt: null,
      postedByUserId: null,
      purchaseDate: date,
      status: "draft",
      totalMinor: amountMinor,
      vendorPartyId: vendor.id,
      vendorReferenceNumber: `DRAFT-VR-${index + 1}`
    });
    purchaseLines.push({
      description: selectedItem.name,
      expenseAccountId: input.accounts.purchases,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      purchaseDocumentId: purchaseId,
      quantity: "1.000000",
      rateMinor: amountMinor,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });

    settlementDocuments.push({
      amountMinor,
      cashAccountId: input.accounts.bank,
      direction: "received",
      documentNumber: null,
      draftReference: `draft-settlement-${settlementId}`,
      id: settlementId,
      journalEntryId: null,
      notes: "Demo draft receipt",
      organizationId: DEMO_ORG_ID,
      partyId: customer.id,
      paymentMode: "bank_transfer",
      postedAt: null,
      postedByUserId: null,
      reference: `DRAFT-UTR-${index + 1}`,
      settlementDate: date,
      status: "draft"
    });
  }

  await tx.insert(salesDocumentTable).values(salesDocuments);
  await tx.insert(salesDocumentLineTable).values(salesLines);
  await tx.insert(purchaseDocumentTable).values(purchaseDocuments);
  await tx.insert(purchaseDocumentLineTable).values(purchaseLines);
  await tx.insert(settlementDocumentTable).values(settlementDocuments);

  for (let index = 0; index < 20; index += 1) {
    const date = dateForIndex(index + 311);
    const amountMinor = BigInt(40_000 + index * 1_111);
    const salesId = createUuidV7();
    const originalEntryId = createUuidV7();
    const reversalEntryId = createUuidV7();
    const documentNumber = takeSequence(input.sequences, "sales_invoice");
    const originalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const reversalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const periodId = periodForDate(input.periods, date);
    const selectedItem = atModulo(input.items, index);
    const customer = atModulo(input.parties.customers, index + 23);

    salesDocuments.push({
      customerPartyId: customer.id,
      documentNumber,
      draftReference: `void-sales-${salesId}`,
      dueDate: addIsoDays(date, 30),
      id: salesId,
      invoiceDate: date,
      journalEntryId: originalEntryId,
      notes: "Demo voided invoice",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: 0n,
      postedAt: timestampForIndex(index + 811),
      postedByUserId: DEMO_USER_ID,
      status: "voided",
      terms: "Net 30",
      totalMinor: amountMinor,
      voidReason: "Demo reversal",
      voidedAt: timestampForIndex(index + 812),
      voidedByUserId: DEMO_USER_ID
    });
    salesLines.push({
      description: selectedItem.name,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      incomeAccountId: input.accounts.sales,
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      quantity: "1.000000",
      rateMinor: amountMinor,
      salesDocumentId: salesId,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Voided sales original ${documentNumber}`,
        entryNumber: originalEntryNumber,
        id: originalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: salesId,
        sourceType: "sales_invoice",
        totalMinor: amountMinor
      }),
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Reversal for ${documentNumber}`,
        entryNumber: reversalEntryNumber,
        id: reversalEntryId,
        reversalOfEntryId: originalEntryId,
        totalMinor: amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId: input.accounts.accountsReceivable,
        debitMinor: amountMinor,
        description: `AR ${documentNumber}`,
        journalEntryId: originalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.sales,
        creditMinor: amountMinor,
        description: `Sales ${documentNumber}`,
        journalEntryId: originalEntryId,
        lineNumber: 2
      }),
      makeJournalLine({
        accountId: input.accounts.accountsReceivable,
        creditMinor: amountMinor,
        description: `Reverse AR ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.sales,
        debitMinor: amountMinor,
        description: `Reverse sales ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 2
      })
    );
    audits.push(makeAudit("sales_document", salesId, "sales_document.voided", documentNumber));
  }

  await flushTradeDocumentRows(tx, {
    audits,
    documents: salesDocuments.slice(drafts),
    entries,
    journalLines,
    lines: salesLines.slice(drafts),
    type: "sales"
  });

  await seedVoidedPurchaseDocuments(tx, input);
  await seedVoidedSettlementDocuments(tx, input);
}

async function seedVoidedPurchaseDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    items: SeededItem[];
    parties: { vendors: SeededParty[] };
    periods: PeriodRange[];
    sequences: Map<string, SequenceState>;
  }
) {
  const documents: PurchaseDocumentInsert[] = [];
  const lines: PurchaseDocumentLineInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < 20; index += 1) {
    const date = dateForIndex(index + 341);
    const amountMinor = BigInt(35_000 + index * 971);
    const documentId = createUuidV7();
    const originalEntryId = createUuidV7();
    const reversalEntryId = createUuidV7();
    const documentKind = index % 3 === 0 ? "expense" : "purchase_bill";
    const documentLabel = documentKind === "expense" ? "Expense" : "Purchase bill";
    const expenseAccountId =
      documentKind === "expense" ? input.accounts.generalExpenses : input.accounts.purchases;
    const documentNumber = takeSequence(input.sequences, documentKind);
    const originalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const reversalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const selectedItem = atModulo(input.items, index + 11);
    const vendor = atModulo(input.parties.vendors, index + 17);
    const periodId = periodForDate(input.periods, date);

    documents.push({
      documentKind,
      documentNumber,
      draftReference: `void-purchase-${documentId}`,
      dueDate: addIsoDays(date, 20),
      id: documentId,
      journalEntryId: originalEntryId,
      notes: "Demo voided bill",
      organizationId: DEMO_ORG_ID,
      outstandingMinor: 0n,
      postedAt: timestampForIndex(index + 861),
      postedByUserId: DEMO_USER_ID,
      purchaseDate: date,
      status: "voided",
      totalMinor: amountMinor,
      vendorPartyId: vendor.id,
      vendorReferenceNumber: `VOID-VR-${index + 1}`,
      voidReason: "Demo reversal",
      voidedAt: timestampForIndex(index + 862),
      voidedByUserId: DEMO_USER_ID
    });
    lines.push({
      description: selectedItem.name,
      expenseAccountId,
      hsnCode: selectedItem.hsnCode,
      id: createUuidV7(),
      itemId: selectedItem.id,
      lineNumber: 1,
      organizationId: DEMO_ORG_ID,
      purchaseDocumentId: documentId,
      quantity: "1.000000",
      rateMinor: amountMinor,
      totalMinor: amountMinor,
      unit: selectedItem.unit
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Voided ${documentLabel.toLowerCase()} original ${documentNumber}`,
        entryNumber: originalEntryNumber,
        id: originalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: documentId,
        sourceType: documentKind,
        totalMinor: amountMinor
      }),
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Reversal for ${documentNumber}`,
        entryNumber: reversalEntryNumber,
        id: reversalEntryId,
        reversalOfEntryId: originalEntryId,
        totalMinor: amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId: expenseAccountId,
        debitMinor: amountMinor,
        description: `${documentLabel} ${documentNumber}`,
        journalEntryId: originalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.accountsPayable,
        creditMinor: amountMinor,
        description: `AP ${documentNumber}`,
        journalEntryId: originalEntryId,
        lineNumber: 2
      }),
      makeJournalLine({
        accountId: expenseAccountId,
        creditMinor: amountMinor,
        description: `Reverse ${documentLabel.toLowerCase()} ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.accountsPayable,
        debitMinor: amountMinor,
        description: `Reverse AP ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 2
      })
    );
    audits.push(
      makeAudit("purchase_document", documentId, "purchase_document.voided", documentNumber)
    );
  }

  await flushTradeDocumentRows(tx, {
    audits,
    documents,
    entries,
    journalLines,
    lines,
    type: "purchase"
  });
}

async function seedVoidedSettlementDocuments(
  tx: TransactionClient,
  input: {
    accounts: Accounts;
    periods: PeriodRange[];
    purchaseTargets: PurchaseTarget[];
    salesTargets: SalesTarget[];
    sequences: Map<string, SequenceState>;
  }
) {
  const documents: SettlementDocumentInsert[] = [];
  const allocations: SettlementAllocationInsert[] = [];
  const entries: JournalEntryInsert[] = [];
  const journalLines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < 20; index += 1) {
    const received = index % 2 === 0;
    let target: PurchaseTarget | SalesTarget;
    let targetDocumentKind: PurchaseTarget["documentKind"] | "sales_invoice";
    if (received) {
      target = atModulo(input.salesTargets, index + 41);
      targetDocumentKind = "sales_invoice";
    } else {
      const purchaseTarget = atModulo(input.purchaseTargets, index + 43);
      target = purchaseTarget;
      targetDocumentKind = purchaseTarget.documentKind;
    }
    const date = minIsoDate(addIsoDays(target.date, 7), FISCAL_YEAR_END_DATE);
    const documentId = createUuidV7();
    const originalEntryId = createUuidV7();
    const reversalEntryId = createUuidV7();
    const sequenceType = received ? "settlement_received" : "settlement_paid";
    const documentNumber = takeSequence(input.sequences, sequenceType);
    const originalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const reversalEntryNumber = takeSequence(input.sequences, "journal_entry");
    const periodId = periodForDate(input.periods, date);
    const debitAccountId = received ? input.accounts.bank : input.accounts.accountsPayable;
    const creditAccountId = received ? input.accounts.accountsReceivable : input.accounts.bank;

    documents.push({
      amountMinor: target.amountMinor,
      cashAccountId: input.accounts.bank,
      direction: received ? "received" : "paid",
      documentNumber,
      draftReference: `void-settlement-${documentId}`,
      id: documentId,
      journalEntryId: originalEntryId,
      notes: `Demo voided ${received ? "receipt" : "payment"}`,
      organizationId: DEMO_ORG_ID,
      partyId: target.partyId,
      paymentMode: "bank_transfer",
      postedAt: timestampForIndex(index + 901),
      postedByUserId: DEMO_USER_ID,
      reference: `VOID-UTR-${index + 1}`,
      settlementDate: date,
      status: "voided",
      voidReason: "Demo reversal",
      voidedAt: timestampForIndex(index + 902),
      voidedByUserId: DEMO_USER_ID
    });
    allocations.push({
      amountMinor: target.amountMinor,
      id: createUuidV7(),
      organizationId: DEMO_ORG_ID,
      purchaseDocumentId: received ? null : target.documentId,
      salesDocumentId: received ? target.documentId : null,
      settlementDocumentId: documentId,
      targetDocumentKind
    });
    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Voided ${received ? "receipt" : "payment"} original ${documentNumber}`,
        entryNumber: originalEntryNumber,
        id: originalEntryId,
        sourceNumber: documentNumber,
        sourceRecordId: documentId,
        sourceType: sequenceType,
        totalMinor: target.amountMinor
      }),
      makeJournalEntry({
        accountingPeriodId: periodId,
        date,
        description: `Reversal for ${documentNumber}`,
        entryNumber: reversalEntryNumber,
        id: reversalEntryId,
        reversalOfEntryId: originalEntryId,
        totalMinor: target.amountMinor
      })
    );
    journalLines.push(
      makeJournalLine({
        accountId: debitAccountId,
        debitMinor: target.amountMinor,
        description: documentNumber,
        journalEntryId: originalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: creditAccountId,
        creditMinor: target.amountMinor,
        description: documentNumber,
        journalEntryId: originalEntryId,
        lineNumber: 2
      }),
      makeJournalLine({
        accountId: debitAccountId,
        creditMinor: target.amountMinor,
        description: `Reverse ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: creditAccountId,
        debitMinor: target.amountMinor,
        description: `Reverse ${documentNumber}`,
        journalEntryId: reversalEntryId,
        lineNumber: 2
      })
    );
    audits.push(
      makeAudit("settlement_document", documentId, "settlement_document.voided", documentNumber)
    );
  }

  await flushSettlementRows(tx, { allocations, audits, documents, entries, journalLines });
}

async function seedManualJournals(
  tx: TransactionClient,
  input: { accounts: Accounts; periods: PeriodRange[]; sequences: Map<string, SequenceState> }
) {
  const entries: JournalEntryInsert[] = [];
  const lines: JournalLineInsert[] = [];
  const audits: AuditEventInsert[] = [];

  for (let index = 0; index < 50; index += 1) {
    const id = createUuidV7();
    const date = dateForIndex(index + 91);
    const amountMinor = BigInt(10_000 + index * 500);
    const entryNumber = takeSequence(input.sequences, "journal_entry");

    entries.push(
      makeJournalEntry({
        accountingPeriodId: periodForDate(input.periods, date),
        date,
        description: `Demo manual journal ${index + 1}`,
        entryNumber,
        id,
        totalMinor: amountMinor
      })
    );
    lines.push(
      makeJournalLine({
        accountId: input.accounts.bank,
        debitMinor: amountMinor,
        description: "Owner capital introduced",
        journalEntryId: id,
        lineNumber: 1
      }),
      makeJournalLine({
        accountId: input.accounts.ownersEquity,
        creditMinor: amountMinor,
        description: "Owner capital introduced",
        journalEntryId: id,
        lineNumber: 2
      })
    );
    audits.push(makeAudit("journal_entry", id, "journal_entry.posted", entryNumber));
  }

  await insertJournalEntryRows(tx, entries);
  await insertJournalLineRows(tx, lines);
  await insertAuditRows(tx, audits);
}

function makeJournalEntry(input: {
  accountingPeriodId: string;
  date: string;
  description: string;
  entryNumber: string;
  id: string;
  reversalOfEntryId?: string;
  sourceNumber?: string;
  sourceRecordId?: string;
  sourceType?: JournalSourceType;
  totalMinor: bigint;
}): JournalEntryInsert {
  return {
    accountingPeriodId: input.accountingPeriodId,
    description: input.description,
    entryNumber: input.entryNumber,
    id: input.id,
    organizationId: DEMO_ORG_ID,
    postedAt: timestampForDate(input.date),
    postedBy: DEMO_USER_ID,
    postingDate: input.date,
    reversalOfEntryId: input.reversalOfEntryId,
    sourceNumber: input.sourceNumber,
    sourceRecordId: input.sourceRecordId,
    sourceType: input.sourceType,
    totalMinor: input.totalMinor
  };
}

function makeJournalLine(input: {
  accountId: string;
  creditMinor?: bigint;
  debitMinor?: bigint;
  description: string;
  journalEntryId: string;
  lineNumber: number;
}): JournalLineInsert {
  return {
    accountId: input.accountId,
    creditMinor: input.creditMinor ?? 0n,
    debitMinor: input.debitMinor ?? 0n,
    description: input.description,
    id: createUuidV7(),
    journalEntryId: input.journalEntryId,
    lineNumber: input.lineNumber,
    organizationId: DEMO_ORG_ID
  };
}

function makeAudit(
  entityType: string,
  entityId: string,
  action: string,
  label: string
): AuditEventInsert {
  return {
    action,
    entityId,
    entityType,
    id: createUuidV7(),
    organizationId: DEMO_ORG_ID,
    payloadJson: {
      after: { label },
      metadata: { source: "demo-seed", userAgent: "demo-seed" }
    },
    scopeId: entityId,
    scopeType: entityType,
    userId: DEMO_USER_ID
  };
}

async function flushTradeDocumentRows(
  tx: TransactionClient,
  input:
    | {
        audits: AuditEventInsert[];
        documents: SalesDocumentInsert[];
        entries: JournalEntryInsert[];
        journalLines: JournalLineInsert[];
        lines: SalesDocumentLineInsert[];
        type: "sales";
      }
    | {
        audits: AuditEventInsert[];
        documents: PurchaseDocumentInsert[];
        entries: JournalEntryInsert[];
        journalLines: JournalLineInsert[];
        lines: PurchaseDocumentLineInsert[];
        type: "purchase";
      }
) {
  if (input.documents.length === 0) {
    return;
  }

  await insertJournalEntryRows(tx, input.entries);
  await insertJournalLineRows(tx, input.journalLines);

  if (input.type === "sales") {
    await tx.insert(salesDocumentTable).values(input.documents);
    await tx.insert(salesDocumentLineTable).values(input.lines);
  } else {
    await tx.insert(purchaseDocumentTable).values(input.documents);
    await tx.insert(purchaseDocumentLineTable).values(input.lines);
  }

  await insertAuditRows(tx, input.audits);
  input.documents.length = 0;
  input.lines.length = 0;
  input.entries.length = 0;
  input.journalLines.length = 0;
  input.audits.length = 0;
}

async function flushSettlementRows(
  tx: TransactionClient,
  input: {
    allocations: SettlementAllocationInsert[];
    audits: AuditEventInsert[];
    documents: SettlementDocumentInsert[];
    entries: JournalEntryInsert[];
    journalLines: JournalLineInsert[];
  }
) {
  if (input.documents.length === 0) {
    return;
  }

  await insertJournalEntryRows(tx, input.entries);
  await insertJournalLineRows(tx, input.journalLines);
  await tx.insert(settlementDocumentTable).values(input.documents);
  await tx.insert(settlementAllocationTable).values(input.allocations);
  await insertAuditRows(tx, input.audits);

  input.documents.length = 0;
  input.allocations.length = 0;
  input.entries.length = 0;
  input.journalLines.length = 0;
  input.audits.length = 0;
}

async function insertPartyRows(tx: TransactionClient, rows: PartyInsert[]) {
  for (const chunk of chunks(rows)) {
    await tx.insert(partyTable).values(chunk);
  }
}

async function insertItemRows(tx: TransactionClient, rows: ItemInsert[]) {
  for (const chunk of chunks(rows)) {
    await tx.insert(itemTable).values(chunk);
  }
}

async function insertJournalEntryRows(tx: TransactionClient, rows: JournalEntryInsert[]) {
  for (const chunk of chunks(rows)) {
    await tx.insert(journalEntryTable).values(chunk);
  }
}

async function insertJournalLineRows(tx: TransactionClient, rows: JournalLineInsert[]) {
  for (const chunk of chunks(rows)) {
    await tx.insert(journalLineTable).values(chunk);
  }
}

async function insertAuditRows(tx: TransactionClient, rows: AuditEventInsert[]) {
  for (const chunk of chunks(rows)) {
    await tx.insert(auditEventTable).values(chunk);
  }
}

function chunks<T>(rows: T[]): T[][] {
  const output: T[][] = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    output.push(rows.slice(index, index + BATCH_SIZE));
  }

  return output;
}

function takeSequence(sequences: Map<string, SequenceState>, entityType: string): string {
  const sequence = sequences.get(entityType);

  if (!sequence) {
    throw new Error(`Missing number sequence: ${entityType}`);
  }

  const value = sequence.nextNumber;
  sequence.nextNumber += 1n;

  return formatSequenceNumber({
    padding: sequence.padding,
    prefix: sequence.prefix,
    sequenceValue: value.toString(),
    suffix: sequence.suffix
  });
}

async function persistSequences(tx: TransactionClient, sequences: Map<string, SequenceState>) {
  for (const sequence of sequences.values()) {
    await tx
      .update(numberSequence)
      .set({ nextNumber: sequence.nextNumber })
      .where(
        and(
          eq(numberSequence.organizationId, DEMO_ORG_ID),
          eq(numberSequence.fiscalYearId, sequence.fiscalYearId),
          eq(numberSequence.entityType, sequence.entityType)
        )
      );
  }
}

function periodForDate(periods: PeriodRange[], date: string): string {
  const period = periods.find((row) => row.startDate <= date && row.endDate >= date);

  if (!period) {
    throw new Error(`No accounting period for date: ${date}`);
  }

  return period.id;
}

function dateForIndex(index: number): string {
  return addIsoDays(BOOKS_START_DATE, index % 365);
}

function timestampForIndex(index: number): Date {
  return timestampForDate(dateForIndex(index));
}

function timestampForDate(date: string): Date {
  return new Date(`${date}T09:30:00.000Z`);
}

function addIsoDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function minIsoDate(left: string, right: string): string {
  return left <= right ? left : right;
}

function atModulo<T>(rows: readonly T[], index: number): T {
  if (rows.length === 0) {
    throw new Error("Demo seed expected a non-empty row pool");
  }

  const row = rows[index % rows.length];

  if (!row) {
    throw new Error(`Demo seed index out of range: ${index}`);
  }

  return row;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function makePan(index: number): string {
  const value = String(index % 10_000).padStart(4, "0");
  return `ABCDE${value}F`;
}

function makeGstin(index: number): string {
  const value = String(index % 10_000).padStart(4, "0");
  return `27ABCDE${value}F1Z5`;
}
