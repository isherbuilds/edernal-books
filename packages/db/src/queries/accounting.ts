import { createHash } from "node:crypto";

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import {
  type AccountingErrorCode,
  type AccountingPeriod,
  type JournalEntryLineSide,
  type JournalEntryRegisterItem,
  type LedgerAccountListItem,
  type PostedJournalEntry,
  type ReverseJournalEntryInput,
  type SetupFiscalYearInput,
  type SetupFiscalYearOutput,
  buildAccountingPeriods,
  DEFAULT_LEDGER_ACCOUNTS,
  formatFiscalYearLabel,
  formatSequenceNumber,
  validateJournalEntryDraft
} from "@tsu-stack/core/accounting";

import { type Database, type TransactionClient } from "#@/client";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { auditEvent } from "#@/schema/audit";
import { journalEntry, journalLine } from "#@/schema/journal";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";

export class AccountingDbError extends Error {
  code: AccountingErrorCode;

  constructor(code: AccountingErrorCode) {
    super(code);
    this.code = code;
  }
}

type OrganizationScopedInput = {
  organizationId: string;
  userId: string;
};

type CreateFiscalYearDbInput = Omit<SetupFiscalYearInput, "orgSlug"> & OrganizationScopedInput;
type SeedDefaultChartDbInput = OrganizationScopedInput;
type SetupOrganizationAccountingDefaultsInput = OrganizationScopedInput & {
  booksStartDate: string;
  initialFiscalYearEndDate: string;
};
type ListLedgerAccountsDbInput = {
  organizationId: string;
  q?: string;
};
type ListAccountingPeriodsDbInput = {
  organizationId: string;
};
type ListJournalEntriesDbInput = {
  limit: number;
  organizationId: string;
};

export type PostJournalEntryLineDbInput = {
  accountId: string;
  amountMinor: bigint;
  description?: string;
  side: JournalEntryLineSide;
};

export type PostJournalEntryDbInput = OrganizationScopedInput & {
  description?: string;
  lines: PostJournalEntryLineDbInput[];
  operationKey: string;
  postingDate: string;
  postingOrigin?: PostingOrigin;
  sourceDocumentId?: string | null;
};

type ReverseJournalEntryDbInput = Omit<ReverseJournalEntryInput, "orgSlug"> &
  OrganizationScopedInput;

type PostJournalEntryInTransactionInput = PostJournalEntryDbInput & {
  requestHash?: string;
  reversalOfEntryId?: string | null;
};

type PostingOrigin = "manual" | "reversal";

type NormalizedJournalLine = {
  accountId: string;
  creditMinor: bigint;
  debitMinor: bigint;
  description?: string;
};

type SequenceAllocation = {
  entryNumber: string;
  sequenceValue: string;
};

type ExistingJournalEntry = {
  entryNumber: string;
  id: string;
  requestHash: string;
};

/**
 * Onboarding entry point: create the first fiscal year and seed the default chart.
 * Idempotent so a retried onboarding never duplicates rows.
 */
export async function setupOrganizationAccountingDefaults(
  tx: TransactionClient,
  input: SetupOrganizationAccountingDefaultsInput
): Promise<void> {
  if (input.booksStartDate > input.initialFiscalYearEndDate) {
    throw new AccountingDbError("FISCAL_YEAR_DATE_RANGE_INVALID");
  }

  await lockFiscalYearScope(tx, input.organizationId);

  const [existingFiscalYear] = await tx
    .select({ id: fiscalYear.id })
    .from(fiscalYear)
    .where(
      and(
        eq(fiscalYear.organizationId, input.organizationId),
        eq(fiscalYear.startDate, input.booksStartDate)
      )
    )
    .limit(1);

  if (!existingFiscalYear) {
    await createFiscalYearInTransaction(tx, {
      endDate: input.initialFiscalYearEndDate,
      organizationId: input.organizationId,
      startDate: input.booksStartDate,
      userId: input.userId
    });
  }

  await seedDefaultChart(tx, {
    organizationId: input.organizationId,
    userId: input.userId
  });
}

/** Create a fiscal year with its monthly periods and journal number sequence. */
export async function createFiscalYear(
  db: Database,
  input: CreateFiscalYearDbInput
): Promise<SetupFiscalYearOutput> {
  return db.transaction((tx) => createFiscalYearInTransaction(tx, input));
}

async function createFiscalYearInTransaction(
  tx: TransactionClient,
  input: CreateFiscalYearDbInput
): Promise<SetupFiscalYearOutput> {
  await lockFiscalYearScope(tx, input.organizationId);

  const name = formatFiscalYearLabel(input.startDate, input.endDate);

  const [overlap] = await tx
    .select({ id: fiscalYear.id })
    .from(fiscalYear)
    .where(
      and(
        eq(fiscalYear.organizationId, input.organizationId),
        lte(fiscalYear.startDate, input.endDate),
        gte(fiscalYear.endDate, input.startDate)
      )
    )
    .limit(1);

  if (overlap) {
    throw new AccountingDbError("FISCAL_YEAR_OVERLAPS");
  }

  const [fiscalYearRow] = await tx
    .insert(fiscalYear)
    .values({
      endDate: input.endDate,
      name,
      organizationId: input.organizationId,
      startDate: input.startDate
    })
    .returning({ id: fiscalYear.id });

  const periodValues = buildAccountingPeriods({
    endDate: input.endDate,
    fiscalYearId: fiscalYearRow.id,
    organizationId: input.organizationId,
    startDate: input.startDate
  });

  const periods = await tx.insert(accountingPeriod).values(periodValues).returning({
    endDate: accountingPeriod.endDate,
    fiscalYearId: accountingPeriod.fiscalYearId,
    id: accountingPeriod.id,
    name: accountingPeriod.name,
    startDate: accountingPeriod.startDate,
    status: accountingPeriod.status
  });

  await tx.insert(numberSequence).values({
    entityType: "journal_entry",
    fiscalYearId: fiscalYearRow.id,
    organizationId: input.organizationId,
    padding: 6,
    prefix: `JV-${name}-`,
    resetPolicy: "fiscal_year"
  });

  await tx.insert(auditEvent).values({
    action: "fiscal_year.setup",
    entityId: fiscalYearRow.id,
    entityType: "fiscal_year",
    organizationId: input.organizationId,
    payloadJson: {
      after: { endDate: input.endDate, name, startDate: input.startDate },
      metadata: { source: "user" }
    },
    scopeId: fiscalYearRow.id,
    scopeType: "fiscal_year",
    userId: input.userId
  });

  return {
    fiscalYearId: fiscalYearRow.id,
    periods
  };
}

async function seedDefaultChart(
  tx: TransactionClient,
  input: SeedDefaultChartDbInput
): Promise<void> {
  // Default accounts are keyed by systemKey, so seeding is a no-op for keys that already exist.
  const existing = await tx
    .select({ id: ledgerAccount.id, systemKey: ledgerAccount.systemKey })
    .from(ledgerAccount)
    .where(
      and(
        eq(ledgerAccount.organizationId, input.organizationId),
        inArray(
          ledgerAccount.systemKey,
          DEFAULT_LEDGER_ACCOUNTS.map((account) => account.systemKey)
        )
      )
    );

  const accountIdBySystemKey = new Map<string, string>();
  for (const account of existing) {
    if (account.systemKey) {
      accountIdBySystemKey.set(account.systemKey, account.id);
    }
  }

  // DEFAULT_LEDGER_ACCOUNTS is ordered parents-before-children, so each parent id resolves first.
  for (const account of DEFAULT_LEDGER_ACCOUNTS) {
    if (accountIdBySystemKey.has(account.systemKey)) {
      continue;
    }

    const [row] = await tx
      .insert(ledgerAccount)
      .values({
        accountCategory: account.accountCategory,
        accountType: account.accountType,
        allowManualPosting: account.allowManualPosting,
        code: account.code,
        isGroup: account.isGroup,
        name: account.name,
        normalBalance: account.normalBalance,
        organizationId: input.organizationId,
        parentAccountId: account.parentSystemKey
          ? (accountIdBySystemKey.get(account.parentSystemKey) ?? null)
          : null,
        sortOrder: account.sortOrder,
        systemKey: account.systemKey
      })
      .returning({ id: ledgerAccount.id });

    accountIdBySystemKey.set(account.systemKey, row.id);
  }

  await tx.insert(auditEvent).values({
    action: "ledger_account.default_chart_seeded",
    entityId: input.organizationId,
    entityType: "ledger_account",
    organizationId: input.organizationId,
    payloadJson: {
      after: {
        accountCodes: DEFAULT_LEDGER_ACCOUNTS.map((account) => account.code),
        accountCount: DEFAULT_LEDGER_ACCOUNTS.length
      },
      metadata: { source: "user" }
    },
    scopeId: input.organizationId,
    scopeType: "organization",
    userId: input.userId
  });
}

export async function listLedgerAccounts(
  db: Database,
  input: ListLedgerAccountsDbInput
): Promise<LedgerAccountListItem[]> {
  const where = input.q
    ? and(
        eq(ledgerAccount.organizationId, input.organizationId),
        or(
          ilike(ledgerAccount.code, `%${input.q}%`),
          ilike(ledgerAccount.name, `%${input.q}%`),
          ilike(ledgerAccount.accountType, `%${input.q}%`)
        )
      )
    : eq(ledgerAccount.organizationId, input.organizationId);

  return db
    .select({
      accountCategory: ledgerAccount.accountCategory,
      accountType: ledgerAccount.accountType,
      active: ledgerAccount.active,
      allowManualPosting: ledgerAccount.allowManualPosting,
      code: ledgerAccount.code,
      id: ledgerAccount.id,
      isGroup: ledgerAccount.isGroup,
      name: ledgerAccount.name,
      normalBalance: ledgerAccount.normalBalance,
      parentAccountId: ledgerAccount.parentAccountId,
      systemKey: ledgerAccount.systemKey
    })
    .from(ledgerAccount)
    .where(where)
    .orderBy(asc(ledgerAccount.sortOrder), asc(ledgerAccount.code));
}

export async function listAccountingPeriods(
  db: Database,
  input: ListAccountingPeriodsDbInput
): Promise<AccountingPeriod[]> {
  return db
    .select({
      endDate: accountingPeriod.endDate,
      fiscalYearId: accountingPeriod.fiscalYearId,
      id: accountingPeriod.id,
      name: accountingPeriod.name,
      startDate: accountingPeriod.startDate,
      status: accountingPeriod.status
    })
    .from(accountingPeriod)
    .where(eq(accountingPeriod.organizationId, input.organizationId))
    .orderBy(asc(accountingPeriod.startDate));
}

export async function listRecentJournalEntries(
  db: Database,
  input: ListJournalEntriesDbInput
): Promise<JournalEntryRegisterItem[]> {
  return db
    .select({
      description: journalEntry.description,
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id,
      postingDate: journalEntry.postingDate,
      reversalOfEntryId: journalEntry.reversalOfEntryId,
      sourceDocumentId: journalEntry.sourceDocumentId,
      totalMinor: sql<string>`${journalEntry.totalMinor}::text`
    })
    .from(journalEntry)
    .where(eq(journalEntry.organizationId, input.organizationId))
    .orderBy(desc(journalEntry.postingDate), desc(journalEntry.entryNumber))
    .limit(input.limit);
}

export async function postJournalEntry(
  db: Database,
  input: PostJournalEntryDbInput
): Promise<PostedJournalEntry> {
  return db.transaction((tx) => postJournalEntryInTransaction(tx, input));
}

export async function reverseJournalEntry(
  db: Database,
  input: ReverseJournalEntryDbInput
): Promise<PostedJournalEntry> {
  return db.transaction(async (tx) => {
    await lockOperationKey(tx, input);
    const requestHash = hashJournalRequest({
      description: input.description,
      journalEntryId: input.journalEntryId,
      operationKey: input.operationKey,
      organizationId: input.organizationId,
      postingDate: input.postingDate,
      postingOrigin: "reversal"
    });

    const existing = await findEntryByOperationKey(tx, {
      operationKey: input.operationKey,
      organizationId: input.organizationId
    });
    if (existing) {
      assertMatchingOperationPayload(existing, requestHash);
      return toPostedJournalEntry(existing, true);
    }

    const original = await loadPostedEntryForReversal(tx, input);
    const reversalLines: PostJournalEntryLineDbInput[] = original.lines.map((line) => {
      return {
        accountId: line.accountId,
        amountMinor: line.debitMinor > 0n ? line.debitMinor : line.creditMinor,
        description: line.description ?? undefined,
        side: line.debitMinor > 0n ? "credit" : "debit"
      };
    });

    return postJournalEntryInTransaction(tx, {
      description: input.description,
      lines: reversalLines,
      operationKey: input.operationKey,
      organizationId: input.organizationId,
      postingDate: input.postingDate,
      postingOrigin: "reversal",
      requestHash,
      reversalOfEntryId: original.entry.id,
      sourceDocumentId: original.entry.sourceDocumentId ?? undefined,
      userId: input.userId
    });
  });
}

async function postJournalEntryInTransaction(
  tx: TransactionClient,
  input: PostJournalEntryInTransactionInput
): Promise<PostedJournalEntry> {
  const postingOrigin = input.postingOrigin ?? "manual";
  const lines = normalizeJournalLines(input.lines);
  const requestHash =
    input.requestHash ??
    hashJournalRequest({
      description: input.description ?? null,
      lines: lines.map((line) => {
        return {
          accountId: line.accountId,
          creditMinor: line.creditMinor.toString(),
          debitMinor: line.debitMinor.toString(),
          description: line.description ?? null
        };
      }),
      operationKey: input.operationKey,
      organizationId: input.organizationId,
      postingDate: input.postingDate,
      postingOrigin,
      reversalOfEntryId: input.reversalOfEntryId ?? null,
      sourceDocumentId: input.sourceDocumentId ?? null
    });

  await lockOperationKey(tx, input);

  const existing = await findEntryByOperationKey(tx, {
    operationKey: input.operationKey,
    organizationId: input.organizationId
  });
  if (existing) {
    assertMatchingOperationPayload(existing, requestHash);
    return toPostedJournalEntry(existing, true);
  }

  const validation = validateJournalEntryDraft({ lines });

  if (!validation.ok) {
    throw new AccountingDbError(validation.errorCode);
  }

  const postingPeriod = await loadPostingPeriod(tx, input);

  await assertPostableAccounts(tx, {
    accountIds: lines.map((line) => line.accountId),
    organizationId: input.organizationId,
    postingOrigin
  });

  const allocationResult = await allocateJournalEntryNumber(tx, {
    fiscalYearId: postingPeriod.fiscalYearId,
    organizationId: input.organizationId
  });

  const [entry] = await tx
    .insert(journalEntry)
    .values({
      accountingPeriodId: postingPeriod.periodId,
      description: input.description ?? null,
      entryNumber: allocationResult.entryNumber,
      operationKey: input.operationKey,
      organizationId: input.organizationId,
      postedAt: new Date(),
      postedBy: input.userId,
      postingDate: input.postingDate,
      requestHash,
      reversalOfEntryId: input.reversalOfEntryId ?? null,
      sourceDocumentId: input.sourceDocumentId ?? null,
      totalMinor: lines.reduce((sum, line) => sum + line.debitMinor, 0n)
    })
    .onConflictDoNothing({
      target: [journalEntry.organizationId, journalEntry.operationKey]
    })
    .returning({
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id,
      requestHash: journalEntry.requestHash
    });

  if (!entry) {
    // The unique key is the durable idempotency guard if advisory locking is bypassed.
    const replayed = await findEntryByOperationKey(tx, {
      operationKey: input.operationKey,
      organizationId: input.organizationId
    });

    if (replayed) {
      assertMatchingOperationPayload(replayed, requestHash);
      return toPostedJournalEntry(replayed, true);
    }

    throw new AccountingDbError("JOURNAL_OPERATION_KEY_ALREADY_USED");
  }

  await tx.insert(journalLine).values(
    lines.map((line, index) => {
      return {
        accountId: line.accountId,
        creditMinor: line.creditMinor,
        debitMinor: line.debitMinor,
        description: line.description ?? null,
        journalEntryId: entry.id,
        lineNumber: index + 1,
        organizationId: input.organizationId
      };
    })
  );

  await tx.insert(auditEvent).values({
    action: postingOrigin === "reversal" ? "journal_entry.reversed" : "journal_entry.posted",
    entityId: entry.id,
    entityType: "journal_entry",
    organizationId: input.organizationId,
    payloadJson: {
      after: {
        entryNumber: entry.entryNumber,
        journalEntryId: entry.id,
        lineCount: lines.length,
        operationKey: input.operationKey,
        reversalOfEntryId: input.reversalOfEntryId ?? null,
        sequenceValue: allocationResult.sequenceValue
      },
      metadata: { source: postingOrigin }
    },
    scopeId: entry.id,
    scopeType: "journal_entry",
    userId: input.userId
  });

  return {
    entryNumber: entry.entryNumber,
    journalEntryId: entry.id,
    replayed: false
  };
}

async function loadPostingPeriod(
  tx: TransactionClient,
  input: { organizationId: string; postingDate: string }
) {
  const [period] = await tx
    .select({
      fiscalYearId: accountingPeriod.fiscalYearId,
      periodId: accountingPeriod.id,
      status: accountingPeriod.status
    })
    .from(accountingPeriod)
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
    throw new AccountingDbError("ACCOUNTING_PERIOD_NOT_FOUND");
  }

  if (period.status === "locked" || period.status === "closed") {
    throw new AccountingDbError("ACCOUNTING_PERIOD_CLOSED");
  }

  return {
    fiscalYearId: period.fiscalYearId,
    periodId: period.periodId
  };
}

async function assertPostableAccounts(
  tx: TransactionClient,
  input: { accountIds: string[]; organizationId: string; postingOrigin: PostingOrigin }
): Promise<void> {
  // Reversals must be able to target group/inactive/manual-blocked accounts to undo a prior post.
  if (input.postingOrigin === "reversal") {
    return;
  }

  const accountIds = Array.from(new Set(input.accountIds));
  const accounts = await tx
    .select({
      active: ledgerAccount.active,
      allowManualPosting: ledgerAccount.allowManualPosting,
      id: ledgerAccount.id,
      isGroup: ledgerAccount.isGroup
    })
    .from(ledgerAccount)
    .where(
      and(
        eq(ledgerAccount.organizationId, input.organizationId),
        inArray(ledgerAccount.id, accountIds)
      )
    );

  const postable =
    accounts.length === accountIds.length &&
    accounts.every((account) => account.active && !account.isGroup && account.allowManualPosting);

  if (!postable) {
    throw new AccountingDbError("JOURNAL_ENTRY_LINE_ACCOUNT_NOT_POSTABLE");
  }
}

async function allocateJournalEntryNumber(
  tx: TransactionClient,
  input: { fiscalYearId: string; organizationId: string }
): Promise<SequenceAllocation> {
  const [row] = await tx
    .update(numberSequence)
    .set({
      nextNumber: sql`${numberSequence.nextNumber} + 1`,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(numberSequence.active, true),
        eq(numberSequence.entityType, "journal_entry"),
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

  if (!row) {
    throw new AccountingDbError("NUMBER_SEQUENCE_NOT_FOUND");
  }

  const sequenceValue = (row.nextNumber - 1n).toString();

  return {
    entryNumber: formatSequenceNumber({
      padding: row.padding,
      prefix: row.prefix,
      sequenceValue,
      suffix: row.suffix
    }),
    sequenceValue
  };
}

async function findEntryByOperationKey(
  tx: TransactionClient,
  input: {
    operationKey: string;
    organizationId: string;
  }
): Promise<ExistingJournalEntry | undefined> {
  const [entry] = await tx
    .select({
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id,
      requestHash: journalEntry.requestHash
    })
    .from(journalEntry)
    .where(
      and(
        eq(journalEntry.operationKey, input.operationKey),
        eq(journalEntry.organizationId, input.organizationId)
      )
    )
    .limit(1);

  if (!entry) {
    return undefined;
  }

  return entry;
}

function assertMatchingOperationPayload(entry: ExistingJournalEntry, requestHash: string): void {
  if (entry.requestHash !== requestHash) {
    throw new AccountingDbError("JOURNAL_OPERATION_KEY_PAYLOAD_MISMATCH");
  }
}

function toPostedJournalEntry(entry: ExistingJournalEntry, replayed: boolean): PostedJournalEntry {
  return {
    entryNumber: entry.entryNumber,
    journalEntryId: entry.id,
    replayed
  };
}

async function lockOperationKey(
  tx: TransactionClient,
  input: { operationKey: string; organizationId: string }
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${input.operationKey}))`
  );
}

async function lockFiscalYearScope(tx: TransactionClient, organizationId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext('fiscal_year'))`
  );
}

function normalizeJournalLines(lines: PostJournalEntryLineDbInput[]): NormalizedJournalLine[] {
  return lines.map((line) => {
    return {
      accountId: line.accountId,
      creditMinor: line.side === "credit" ? line.amountMinor : 0n,
      debitMinor: line.side === "debit" ? line.amountMinor : 0n,
      description: line.description
    };
  });
}

function hashJournalRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function loadPostedEntryForReversal(
  tx: TransactionClient,
  input: { journalEntryId: string; organizationId: string }
) {
  const [entry] = await tx
    .select({
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id,
      reversalOfEntryId: journalEntry.reversalOfEntryId,
      sourceDocumentId: journalEntry.sourceDocumentId
    })
    .from(journalEntry)
    .where(
      and(
        eq(journalEntry.id, input.journalEntryId),
        eq(journalEntry.organizationId, input.organizationId)
      )
    )
    .limit(1)
    .for("update");

  if (!entry) {
    throw new AccountingDbError("JOURNAL_ENTRY_NOT_FOUND");
  }

  if (entry.reversalOfEntryId) {
    throw new AccountingDbError("JOURNAL_ENTRY_ALREADY_REVERSED");
  }

  const [existingReversal] = await tx
    .select({ id: journalEntry.id })
    .from(journalEntry)
    .where(
      and(
        eq(journalEntry.organizationId, input.organizationId),
        eq(journalEntry.reversalOfEntryId, input.journalEntryId)
      )
    )
    .limit(1);

  if (existingReversal) {
    throw new AccountingDbError("JOURNAL_ENTRY_ALREADY_REVERSED");
  }

  const lines = await tx
    .select({
      accountId: journalLine.accountId,
      creditMinor: journalLine.creditMinor,
      debitMinor: journalLine.debitMinor,
      description: journalLine.description
    })
    .from(journalLine)
    .where(
      and(
        eq(journalLine.journalEntryId, entry.id),
        eq(journalLine.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(journalLine.lineNumber));

  return { entry, lines };
}
