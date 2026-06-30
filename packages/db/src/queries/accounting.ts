import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import {
  type AccountingErrorCode,
  type AccountingPeriod,
  type JournalEntryLineSide,
  type JournalEntryRegisterItem,
  type JournalSourceType,
  type LedgerAccountListItem,
  type PostedJournalEntry,
  type ReverseJournalEntryInput,
  type SetupFiscalYearInput,
  type SetupFiscalYearOutput,
  buildAccountingPeriods,
  DEFAULT_LEDGER_ACCOUNTS,
  formatFiscalYearLabel,
  formatSequenceNumber,
  JOURNAL_SOURCE_PREFIX_BY_TYPE,
  JOURNAL_SOURCE_TYPES,
  validateJournalEntryDraft
} from "@tsu-stack/core/accounting";

import { type Database, type TransactionClient } from "#@/client";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { auditEvent } from "#@/schema/audit";
import { journalEntry, journalLine } from "#@/schema/journal";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";
import { escapeLikePattern } from "#@/utils/sql";

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
  postingDate: string;
};

type ReverseJournalEntryDbInput = Omit<ReverseJournalEntryInput, "orgSlug"> &
  OrganizationScopedInput;
type ReverseJournalEntryInTransactionInput = ReverseJournalEntryDbInput & {
  allowSourcedEntry?: boolean;
};

type JournalSourceMetadata = { type: JournalSourceType; recordId: string; number: string };

export type PostJournalEntryInTransactionInput = PostJournalEntryDbInput & {
  postingOrigin?: PostingOrigin;
  postingPeriod?: {
    fiscalYearId: string;
    periodId: string;
  };
  reversalOfEntryId?: string | null;
  source?: JournalSourceMetadata | null;
};

export type PostingOrigin = "manual" | "document_workflow" | "reversal";

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

type DocumentSequenceType = JournalSourceType;

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
    .select({ id: fiscalYear.id, name: fiscalYear.name })
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
  } else {
    await seedDocumentSequences(tx, {
      fiscalYearId: existingFiscalYear.id,
      fiscalYearName: existingFiscalYear.name,
      organizationId: input.organizationId
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

  await tx.insert(numberSequence).values([
    {
      entityType: "journal_entry",
      fiscalYearId: fiscalYearRow.id,
      organizationId: input.organizationId,
      padding: 6,
      prefix: `JV-${name}-`,
      resetPolicy: "fiscal_year"
    },
    ...documentSequenceRows({
      fiscalYearId: fiscalYearRow.id,
      fiscalYearName: name,
      organizationId: input.organizationId
    })
  ]);

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

async function seedDocumentSequences(
  tx: TransactionClient,
  input: { fiscalYearId: string; fiscalYearName: string; organizationId: string }
) {
  await tx.insert(numberSequence).values(documentSequenceRows(input)).onConflictDoNothing();
}

function documentSequenceRows(input: {
  fiscalYearId: string;
  fiscalYearName: string;
  organizationId: string;
}) {
  return JOURNAL_SOURCE_TYPES.map((entityType) => {
    return {
      entityType,
      fiscalYearId: input.fiscalYearId,
      organizationId: input.organizationId,
      padding: 6,
      prefix: `${documentSequencePrefix(entityType)}-${input.fiscalYearName}-`,
      resetPolicy: "fiscal_year"
    };
  });
}

export function documentSequencePrefix(entityType: DocumentSequenceType): string {
  return JOURNAL_SOURCE_PREFIX_BY_TYPE[entityType];
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

  const seededAccountCodes: string[] = [];

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
    seededAccountCodes.push(account.code);
  }

  if (seededAccountCodes.length === 0) {
    return;
  }

  await tx.insert(auditEvent).values({
    action: "ledger_account.default_chart_seeded",
    entityId: input.organizationId,
    entityType: "ledger_account",
    organizationId: input.organizationId,
    payloadJson: {
      after: {
        accountCodes: seededAccountCodes,
        accountCount: seededAccountCodes.length
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
  const trimmedQuery = input.q?.trim();
  const search = trimmedQuery ? `%${escapeLikePattern(trimmedQuery)}%` : undefined;
  const where = search
    ? and(
        eq(ledgerAccount.organizationId, input.organizationId),
        or(
          ilike(ledgerAccount.code, search),
          ilike(ledgerAccount.name, search),
          ilike(ledgerAccount.accountType, search)
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
  return db.transaction((tx) =>
    postJournalEntryInTransaction(tx, {
      description: input.description,
      lines: input.lines,
      organizationId: input.organizationId,
      postingDate: input.postingDate,
      userId: input.userId
    })
  );
}

export async function reverseJournalEntry(
  db: Database,
  input: ReverseJournalEntryDbInput
): Promise<PostedJournalEntry> {
  return db.transaction((tx) => reverseJournalEntryInTransaction(tx, input));
}

export async function reverseJournalEntryInTransaction(
  tx: TransactionClient,
  input: ReverseJournalEntryInTransactionInput
): Promise<PostedJournalEntry> {
  const original = await loadPostedEntryForReversal(tx, input);
  if (input.postingDate < dateString(original.entry.postingDate)) {
    throw new AccountingDbError("JOURNAL_ENTRY_REVERSAL_DATE_INVALID");
  }

  const reversalLines: PostJournalEntryLineDbInput[] = original.lines.map((line) => {
    return {
      accountId: line.accountId,
      amountMinor: line.debitMinor > 0n ? line.debitMinor : line.creditMinor,
      description: line.description ?? undefined,
      side: line.debitMinor > 0n ? "credit" : "debit"
    };
  });
  const hasSource =
    original.entry.sourceType !== null ||
    original.entry.sourceRecordId !== null ||
    original.entry.sourceNumber !== null;
  let source: JournalSourceMetadata | null = null;

  if (hasSource) {
    if (!input.allowSourcedEntry) {
      throw new AccountingDbError("JOURNAL_ENTRY_SOURCED_REVERSAL_FORBIDDEN");
    }

    const { sourceNumber, sourceRecordId, sourceType } = original.entry;

    if (!sourceType || !sourceRecordId || !sourceNumber) {
      throw new Error("Journal source columns must be all populated or all null");
    }

    source = {
      number: sourceNumber,
      recordId: sourceRecordId,
      type: sourceType
    };
  }

  return postJournalEntryInTransaction(tx, {
    description: input.description,
    lines: reversalLines,
    organizationId: input.organizationId,
    postingDate: input.postingDate,
    postingOrigin: "reversal",
    reversalOfEntryId: original.entry.id,
    source,
    userId: input.userId
  });
}

export async function postJournalEntryInTransaction(
  tx: TransactionClient,
  input: PostJournalEntryInTransactionInput
): Promise<PostedJournalEntry> {
  const postingOrigin = input.postingOrigin ?? "manual";
  const lines = normalizeJournalLines(input.lines);
  const validation = validateJournalEntryDraft({ lines });

  if (!validation.ok) {
    throw new AccountingDbError(validation.errorCode);
  }

  const postingPeriod = input.postingPeriod ?? (await loadPostingPeriod(tx, input));

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
      organizationId: input.organizationId,
      postedAt: new Date(),
      postedBy: input.userId,
      postingDate: input.postingDate,
      reversalOfEntryId: input.reversalOfEntryId ?? null,
      sourceNumber: input.source?.number ?? null,
      sourceRecordId: input.source?.recordId ?? null,
      sourceType: input.source?.type ?? null,
      totalMinor: lines.reduce((sum, line) => sum + line.debitMinor, 0n)
    })
    .returning({
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id
    });

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
    journalEntryId: entry.id
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
    accounts.every(
      (account) =>
        account.active &&
        !account.isGroup &&
        (input.postingOrigin === "document_workflow" || account.allowManualPosting)
    );

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

async function loadPostedEntryForReversal(
  tx: TransactionClient,
  input: { journalEntryId: string; organizationId: string }
) {
  const [entry] = await tx
    .select({
      entryNumber: journalEntry.entryNumber,
      id: journalEntry.id,
      postingDate: journalEntry.postingDate,
      reversalOfEntryId: journalEntry.reversalOfEntryId,
      sourceNumber: journalEntry.sourceNumber,
      sourceRecordId: journalEntry.sourceRecordId,
      sourceType: journalEntry.sourceType
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

function dateString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}
