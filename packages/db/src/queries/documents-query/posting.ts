import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";

import { formatSequenceNumber } from "@tsu-stack/core/accounting";
import { type DocumentKind, type PostedDocument } from "@tsu-stack/core/documents";

import { type TransactionClient } from "#@/client";
import {
  documentSequencePrefix,
  type PostJournalEntryLineDbInput,
  postJournalEntryInTransaction
} from "#@/queries/accounting";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import {
  purchaseDocument,
  salesDocument,
  type settlementAllocation,
  settlementDocument
} from "#@/schema/documents";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";

import { applySettlementAllocations } from "./allocations";
import { insertDocumentAuditEvent } from "./audit";
import { DocumentDbError } from "./errors";
import { documentLabel } from "./shared";
import { type DocumentSequenceType, type PostingPeriod, type SequenceAllocation } from "./types";

type DocumentPostingAccountRule =
  | { accountId: string; category: "expense" | "income" }
  | { accountId: string; category: "asset"; accountTypes: readonly ["cash", "bank"] };
type PostDocumentDraftInput = {
  documentId: string;
  documentKind: DocumentKind;
  organizationId: string;
  userId: string;
};
type PostPurchaseDocumentDraftInput = PostDocumentDraftInput & {
  documentKind: "expense" | "purchase_bill";
};
type PostingSystemAccountRule = {
  category: "asset" | "liability";
  systemKey: string;
};
export type SalesPostingLine = {
  description: string;
  incomeAccountId: string;
  totalMinor: bigint;
};
export type PurchasePostingLine = {
  description: string;
  expenseAccountId: string;
  totalMinor: bigint;
};
export type SettlementPostingAllocation = Pick<
  typeof settlementAllocation.$inferSelect,
  "amountMinor" | "purchaseDocumentId" | "salesDocumentId" | "targetDocumentKind"
>;
export type SalesPostingDocument = {
  invoiceDate: string;
  lines: SalesPostingLine[];
  totalMinor: bigint;
};
export type PurchasePostingDocument = {
  documentKind: "expense" | "purchase_bill";
  lines: PurchasePostingLine[];
  purchaseDate: string;
  totalMinor: bigint;
};
export type SettlementPostingDocument = {
  allocations: SettlementPostingAllocation[];
  amountMinor: bigint;
  cashAccountId: string;
  direction: "paid" | "received";
  partyId: string;
  settlementDate: string;
};

export async function postPurchaseDocumentDraft(
  tx: TransactionClient,
  input: PostPurchaseDocumentDraftInput,
  row: PurchasePostingDocument
): Promise<PostedDocument> {
  const { systemAccountId: accountsPayableId } = await loadPostingAccounts(tx, {
    manualAccounts: row.lines.map((line) => {
      return { accountId: line.expenseAccountId, category: "expense" };
    }),
    organizationId: input.organizationId,
    systemAccount: { category: "liability", systemKey: "accounts_payable" }
  });

  const postingPeriod = await loadPostingPeriod(tx, {
    organizationId: input.organizationId,
    postingDate: row.purchaseDate
  });
  const numberAllocation = await allocateDocumentNumber(tx, {
    entityType: row.documentKind,
    fiscalYearId: postingPeriod.fiscalYearId,
    fiscalYearName: postingPeriod.fiscalYearName,
    organizationId: input.organizationId
  });
  const journal = await postJournalEntryInTransaction(tx, {
    description: `${documentLabel(row.documentKind)} ${numberAllocation.documentNumber}`,
    lines: [
      ...row.lines.map((line): PostJournalEntryLineDbInput => {
        return {
          accountId: line.expenseAccountId,
          amountMinor: line.totalMinor,
          description: line.description,
          side: "debit"
        };
      }),
      {
        accountId: accountsPayableId,
        amountMinor: row.totalMinor,
        description: `${documentLabel(row.documentKind)} ${numberAllocation.documentNumber}`,
        side: "credit"
      }
    ],
    organizationId: input.organizationId,
    postingDate: row.purchaseDate,
    postingOrigin: "document_workflow",
    postingPeriod: {
      fiscalYearId: postingPeriod.fiscalYearId,
      periodId: postingPeriod.periodId
    },
    source: {
      number: numberAllocation.documentNumber,
      recordId: input.documentId,
      type: row.documentKind
    },
    userId: input.userId
  });

  const [postedDocument] = await tx
    .update(purchaseDocument)
    .set({
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      outstandingMinor: row.totalMinor,
      postedAt: new Date(),
      postedByUserId: input.userId,
      status: "posted"
    })
    .where(
      and(
        eq(purchaseDocument.id, input.documentId),
        eq(purchaseDocument.organizationId, input.organizationId),
        eq(purchaseDocument.documentKind, row.documentKind),
        eq(purchaseDocument.status, "draft")
      )
    )
    .returning({ id: purchaseDocument.id });
  assertPostedDocumentUpdateApplied(postedDocument);

  await insertDocumentAuditEvent(tx, {
    action: `${row.documentKind}.posted`,
    after: {
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      sequenceValue: numberAllocation.sequenceValue
    },
    entityId: input.documentId,
    entityType: row.documentKind,
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: row.documentKind,
    documentNumber: numberAllocation.documentNumber,
    journalEntryId: journal.journalEntryId
  };
}

export async function postSalesDocumentDraft(
  tx: TransactionClient,
  input: PostDocumentDraftInput,
  row: SalesPostingDocument
): Promise<PostedDocument> {
  const { systemAccountId: accountsReceivableId } = await loadPostingAccounts(tx, {
    manualAccounts: row.lines.map((line) => {
      return { accountId: line.incomeAccountId, category: "income" };
    }),
    organizationId: input.organizationId,
    systemAccount: { category: "asset", systemKey: "accounts_receivable" }
  });

  const postingPeriod = await loadPostingPeriod(tx, {
    organizationId: input.organizationId,
    postingDate: row.invoiceDate
  });
  const numberAllocation = await allocateDocumentNumber(tx, {
    entityType: "sales_invoice",
    fiscalYearId: postingPeriod.fiscalYearId,
    fiscalYearName: postingPeriod.fiscalYearName,
    organizationId: input.organizationId
  });
  const journal = await postJournalEntryInTransaction(tx, {
    description: `Sales invoice ${numberAllocation.documentNumber}`,
    lines: [
      {
        accountId: accountsReceivableId,
        amountMinor: row.totalMinor,
        description: `Sales invoice ${numberAllocation.documentNumber}`,
        side: "debit"
      },
      ...row.lines.map((line): PostJournalEntryLineDbInput => {
        return {
          accountId: line.incomeAccountId,
          amountMinor: line.totalMinor,
          description: line.description,
          side: "credit"
        };
      })
    ],
    organizationId: input.organizationId,
    postingDate: row.invoiceDate,
    postingOrigin: "document_workflow",
    postingPeriod: {
      fiscalYearId: postingPeriod.fiscalYearId,
      periodId: postingPeriod.periodId
    },
    source: {
      number: numberAllocation.documentNumber,
      recordId: input.documentId,
      type: "sales_invoice"
    },
    userId: input.userId
  });

  const [postedDocument] = await tx
    .update(salesDocument)
    .set({
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      outstandingMinor: row.totalMinor,
      postedAt: new Date(),
      postedByUserId: input.userId,
      status: "posted"
    })
    .where(
      and(
        eq(salesDocument.id, input.documentId),
        eq(salesDocument.organizationId, input.organizationId),
        eq(salesDocument.status, "draft")
      )
    )
    .returning({ id: salesDocument.id });
  assertPostedDocumentUpdateApplied(postedDocument);

  await insertDocumentAuditEvent(tx, {
    action: "sales_invoice.posted",
    after: {
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      sequenceValue: numberAllocation.sequenceValue
    },
    entityId: input.documentId,
    entityType: "sales_invoice",
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: "sales_invoice",
    documentNumber: numberAllocation.documentNumber,
    journalEntryId: journal.journalEntryId
  };
}

export async function postSettlementDocumentDraft(
  tx: TransactionClient,
  input: PostDocumentDraftInput,
  row: SettlementPostingDocument
): Promise<PostedDocument> {
  const { systemAccountId: contraAccountId } = await loadPostingAccounts(tx, {
    manualAccounts: [
      { accountId: row.cashAccountId, accountTypes: ["cash", "bank"], category: "asset" }
    ],
    organizationId: input.organizationId,
    systemAccount: {
      category: row.direction === "received" ? "asset" : "liability",
      systemKey: row.direction === "received" ? "accounts_receivable" : "accounts_payable"
    }
  });

  await applySettlementAllocations(tx, {
    allocations: row.allocations,
    direction: row.direction,
    multiplier: -1n,
    organizationId: input.organizationId,
    partyId: row.partyId
  });

  const postingPeriod = await loadPostingPeriod(tx, {
    organizationId: input.organizationId,
    postingDate: row.settlementDate
  });
  const sequenceType: DocumentSequenceType =
    row.direction === "received" ? "settlement_received" : "settlement_paid";
  const numberAllocation = await allocateDocumentNumber(tx, {
    entityType: sequenceType,
    fiscalYearId: postingPeriod.fiscalYearId,
    fiscalYearName: postingPeriod.fiscalYearName,
    organizationId: input.organizationId
  });
  const journal = await postJournalEntryInTransaction(tx, {
    description:
      row.direction === "received"
        ? `Receipt ${numberAllocation.documentNumber}`
        : `Payment ${numberAllocation.documentNumber}`,
    lines:
      row.direction === "received"
        ? [
            {
              accountId: row.cashAccountId,
              amountMinor: row.amountMinor,
              description: `Receipt ${numberAllocation.documentNumber}`,
              side: "debit"
            },
            {
              accountId: contraAccountId,
              amountMinor: row.amountMinor,
              description: `Receipt ${numberAllocation.documentNumber}`,
              side: "credit"
            }
          ]
        : [
            {
              accountId: contraAccountId,
              amountMinor: row.amountMinor,
              description: `Payment ${numberAllocation.documentNumber}`,
              side: "debit"
            },
            {
              accountId: row.cashAccountId,
              amountMinor: row.amountMinor,
              description: `Payment ${numberAllocation.documentNumber}`,
              side: "credit"
            }
          ],
    organizationId: input.organizationId,
    postingDate: row.settlementDate,
    postingOrigin: "document_workflow",
    postingPeriod: {
      fiscalYearId: postingPeriod.fiscalYearId,
      periodId: postingPeriod.periodId
    },
    source: {
      number: numberAllocation.documentNumber,
      recordId: input.documentId,
      type: sequenceType
    },
    userId: input.userId
  });

  const [postedDocument] = await tx
    .update(settlementDocument)
    .set({
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      postedAt: new Date(),
      postedByUserId: input.userId,
      status: "posted"
    })
    .where(
      and(
        eq(settlementDocument.id, input.documentId),
        eq(settlementDocument.organizationId, input.organizationId),
        eq(settlementDocument.status, "draft")
      )
    )
    .returning({ id: settlementDocument.id });
  assertPostedDocumentUpdateApplied(postedDocument);

  await insertDocumentAuditEvent(tx, {
    action: row.direction === "received" ? "receipt.posted" : "payment.posted",
    after: {
      documentNumber: numberAllocation.documentNumber,
      journalEntryId: journal.journalEntryId,
      sequenceValue: numberAllocation.sequenceValue
    },
    entityId: input.documentId,
    entityType: "settlement",
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: "settlement",
    documentNumber: numberAllocation.documentNumber,
    journalEntryId: journal.journalEntryId
  };
}

async function loadPostingPeriod(
  tx: TransactionClient,
  input: { organizationId: string; postingDate: string }
): Promise<PostingPeriod> {
  const [period] = await tx
    .select({
      fiscalYearId: accountingPeriod.fiscalYearId,
      fiscalYearName: fiscalYear.name,
      periodId: accountingPeriod.id,
      status: accountingPeriod.status
    })
    .from(accountingPeriod)
    .innerJoin(
      fiscalYear,
      and(
        eq(fiscalYear.id, accountingPeriod.fiscalYearId),
        eq(fiscalYear.organizationId, input.organizationId)
      )
    )
    .where(
      and(
        eq(accountingPeriod.organizationId, input.organizationId),
        lte(accountingPeriod.startDate, input.postingDate),
        gte(accountingPeriod.endDate, input.postingDate)
      )
    )
    .orderBy(asc(accountingPeriod.startDate))
    .limit(1);

  if (!period) {
    throw new DocumentDbError("DOCUMENT_DATE_INVALID");
  }

  if (period.status === "locked" || period.status === "closed") {
    throw new DocumentDbError("DOCUMENT_PERIOD_CLOSED");
  }

  return {
    fiscalYearId: period.fiscalYearId,
    fiscalYearName: period.fiscalYearName,
    periodId: period.periodId
  };
}

async function allocateDocumentNumber(
  tx: TransactionClient,
  input: {
    entityType: DocumentSequenceType;
    fiscalYearId: string;
    fiscalYearName: string;
    organizationId: string;
  }
): Promise<SequenceAllocation> {
  const row =
    (await incrementDocumentNumberSequence(tx, input)) ??
    (await insertAndIncrementDocumentNumberSequence(tx, input));

  if (!row) {
    throw new DocumentDbError("DOCUMENT_DATE_INVALID");
  }

  const sequenceValue = (row.nextNumber - 1n).toString();

  return {
    documentNumber: formatSequenceNumber({
      padding: row.padding,
      prefix: row.prefix,
      sequenceValue,
      suffix: row.suffix
    }),
    sequenceValue
  };
}

async function incrementDocumentNumberSequence(
  tx: TransactionClient,
  input: { entityType: DocumentSequenceType; fiscalYearId: string; organizationId: string }
) {
  const [row] = await tx
    .update(numberSequence)
    .set({
      nextNumber: sql`${numberSequence.nextNumber} + 1`,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(numberSequence.active, true),
        eq(numberSequence.entityType, input.entityType),
        eq(numberSequence.fiscalYearId, input.fiscalYearId),
        eq(numberSequence.organizationId, input.organizationId)
      )
    )
    .returning({
      nextNumber: numberSequence.nextNumber,
      padding: numberSequence.padding,
      prefix: numberSequence.prefix,
      suffix: numberSequence.suffix
    });

  return row ?? null;
}

async function insertAndIncrementDocumentNumberSequence(
  tx: TransactionClient,
  input: {
    entityType: DocumentSequenceType;
    fiscalYearId: string;
    fiscalYearName: string;
    organizationId: string;
  }
) {
  await tx
    .insert(numberSequence)
    .values({
      entityType: input.entityType,
      fiscalYearId: input.fiscalYearId,
      organizationId: input.organizationId,
      padding: 6,
      prefix: `${documentSequencePrefix(input.entityType)}-${input.fiscalYearName}-`,
      resetPolicy: "fiscal_year"
    })
    .onConflictDoNothing();

  return incrementDocumentNumberSequence(tx, input);
}

function assertPostedDocumentUpdateApplied(row: { id: string } | undefined) {
  if (!row) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }
}

async function loadPostingAccounts(
  tx: TransactionClient,
  input: {
    manualAccounts: readonly DocumentPostingAccountRule[];
    organizationId: string;
    systemAccount: PostingSystemAccountRule;
  }
): Promise<{ systemAccountId: string }> {
  const manualAccountIds = Array.from(new Set(input.manualAccounts.map((rule) => rule.accountId)));
  const accounts = await tx
    .select({
      accountCategory: ledgerAccount.accountCategory,
      accountType: ledgerAccount.accountType,
      active: ledgerAccount.active,
      allowManualPosting: ledgerAccount.allowManualPosting,
      id: ledgerAccount.id,
      isGroup: ledgerAccount.isGroup,
      systemKey: ledgerAccount.systemKey
    })
    .from(ledgerAccount)
    .where(
      and(
        eq(ledgerAccount.organizationId, input.organizationId),
        manualAccountIds.length > 0
          ? or(
              inArray(ledgerAccount.id, manualAccountIds),
              eq(ledgerAccount.systemKey, input.systemAccount.systemKey)
            )
          : eq(ledgerAccount.systemKey, input.systemAccount.systemKey)
      )
    );
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const systemAccount = accounts.find(
    (account) => account.systemKey === input.systemAccount.systemKey
  );

  for (const rule of input.manualAccounts) {
    const account = accountsById.get(rule.accountId);

    if (
      !account ||
      !account.active ||
      account.isGroup ||
      !account.allowManualPosting ||
      account.accountCategory !== rule.category
    ) {
      throw new DocumentDbError("DOCUMENT_ACCOUNT_INVALID");
    }

    if (
      "accountTypes" in rule &&
      !rule.accountTypes.some((accountType) => accountType === account.accountType)
    ) {
      throw new DocumentDbError("DOCUMENT_ACCOUNT_INVALID");
    }
  }

  if (
    !systemAccount ||
    !systemAccount.active ||
    systemAccount.isGroup ||
    systemAccount.accountCategory !== input.systemAccount.category
  ) {
    throw new DocumentDbError("DOCUMENT_ACCOUNT_ORGANIZATION_MISMATCH");
  }

  return { systemAccountId: systemAccount.id };
}
