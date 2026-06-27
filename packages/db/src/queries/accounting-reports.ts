import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

import { and, asc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";

import {
  buildTrialBalance,
  type GeneralLedgerRunningLine,
  type TrialBalance,
  toNormalBalanceMinor,
  withGeneralLedgerRunningBalance
} from "@tsu-stack/core/accounting";

import { type Database, type TransactionClient } from "#@/client";
import { AccountingDbError } from "#@/queries/accounting";
import { ledgerAccount } from "#@/schema/accounts";
import { journalEntry, journalLine } from "#@/schema/journal";

type AccountingReportDbInput = {
  fromDate?: string;
  organizationId: string;
  toDate?: string;
};

type TrialBalanceDbInput = {
  asOfDate: string;
  organizationId: string;
};

type GeneralLedgerDbInput = AccountingReportDbInput & {
  accountId: string;
  cursor?: string;
  limit: number;
};

type GeneralLedgerCursor = {
  accountId: string;
  entryNumber: string;
  fromDate?: string;
  journalEntryId: string;
  lineNumber: number;
  postingDate: string;
  runningBalanceMinor: bigint;
  toDate?: string;
};

type GeneralLedgerCursorPayload = Omit<GeneralLedgerCursor, "runningBalanceMinor"> & {
  runningBalanceMinor: string;
};

type GeneralLedgerRow = Omit<
  GeneralLedgerRunningLine,
  "openingBalanceMinor" | "runningBalanceMinor"
>;

export async function getTrialBalance(
  db: Database,
  input: TrialBalanceDbInput
): Promise<TrialBalance> {
  const rows = await db
    .select({
      accountCategory: ledgerAccount.accountCategory,
      accountCode: ledgerAccount.code,
      accountId: ledgerAccount.id,
      accountName: ledgerAccount.name,
      creditMinor: sql<string>`COALESCE(sum(${journalLine.creditMinor}), 0)::text`,
      debitMinor: sql<string>`COALESCE(sum(${journalLine.debitMinor}), 0)::text`,
      normalBalance: ledgerAccount.normalBalance
    })
    .from(journalLine)
    .innerJoin(
      journalEntry,
      and(
        eq(journalEntry.organizationId, journalLine.organizationId),
        eq(journalEntry.id, journalLine.journalEntryId)
      )
    )
    .innerJoin(
      ledgerAccount,
      and(
        eq(ledgerAccount.organizationId, journalLine.organizationId),
        eq(ledgerAccount.id, journalLine.accountId)
      )
    )
    .where(
      and(
        eq(journalLine.organizationId, input.organizationId),
        lte(journalEntry.postingDate, input.asOfDate)
      )
    )
    .groupBy(
      ledgerAccount.accountCategory,
      ledgerAccount.code,
      ledgerAccount.id,
      ledgerAccount.name,
      ledgerAccount.normalBalance
    )
    .orderBy(asc(ledgerAccount.code));

  return buildTrialBalance(
    rows.map((row) => {
      return {
        ...row,
        creditMinor: BigInt(row.creditMinor),
        debitMinor: BigInt(row.debitMinor)
      };
    })
  );
}

export async function getGeneralLedger(
  db: Database,
  input: GeneralLedgerDbInput
): Promise<{
  closingBalanceMinor: bigint;
  lines: GeneralLedgerRunningLine[];
  nextCursor: null | string;
  openingBalanceMinor: bigint;
}> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);

    const cursor = input.cursor ? decodeGeneralLedgerCursor(input.cursor) : undefined;
    if (cursor) {
      assertGeneralLedgerCursorMatchesInput(cursor, input);
      await assertGeneralLedgerCursorAnchorExists(tx, input, cursor);
    }
    const openingBalanceMinor = cursor
      ? cursor.runningBalanceMinor
      : await getOpeningBalanceMinor(tx, input);
    const rows = await getGeneralLedgerRows(tx, input, cursor);
    const pageRows = rows.slice(0, input.limit);
    const lines = withGeneralLedgerRunningBalance(
      pageRows.map((row) => {
        return {
          ...row,
          openingBalanceMinor
        };
      })
    );
    const closingBalanceMinor = lines.at(-1)?.runningBalanceMinor ?? openingBalanceMinor;
    const lastLine = lines.at(-1);
    const nextCursor =
      rows.length > input.limit && lastLine ? encodeGeneralLedgerCursor(lastLine, input) : null;

    return {
      closingBalanceMinor,
      lines,
      nextCursor,
      openingBalanceMinor
    };
  });
}

async function getGeneralLedgerRows(
  tx: TransactionClient,
  input: GeneralLedgerDbInput,
  cursor: GeneralLedgerCursor | undefined
): Promise<GeneralLedgerRow[]> {
  const conditions = buildPostedLineConditions(input);
  conditions.push(eq(journalLine.accountId, input.accountId));

  if (cursor) {
    conditions.push(buildAfterCursorCondition(cursor));
  }

  return tx
    .select({
      accountCode: ledgerAccount.code,
      accountId: ledgerAccount.id,
      accountName: ledgerAccount.name,
      creditMinor: journalLine.creditMinor,
      debitMinor: journalLine.debitMinor,
      description: journalLine.description,
      entryNumber: journalEntry.entryNumber,
      journalEntryId: journalEntry.id,
      lineNumber: journalLine.lineNumber,
      normalBalance: ledgerAccount.normalBalance,
      postingDate: journalEntry.postingDate
    })
    .from(journalLine)
    .innerJoin(
      journalEntry,
      and(
        eq(journalEntry.organizationId, journalLine.organizationId),
        eq(journalEntry.id, journalLine.journalEntryId)
      )
    )
    .innerJoin(
      ledgerAccount,
      and(
        eq(ledgerAccount.organizationId, journalLine.organizationId),
        eq(ledgerAccount.id, journalLine.accountId)
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(journalEntry.postingDate),
      asc(journalEntry.entryNumber),
      asc(journalEntry.id),
      asc(journalLine.lineNumber)
    )
    .limit(input.limit + 1);
}

async function getOpeningBalanceMinor(
  tx: TransactionClient,
  input: GeneralLedgerDbInput
): Promise<bigint> {
  const balanceBoundary = input.fromDate ? lt(journalEntry.postingDate, input.fromDate) : undefined;

  if (!balanceBoundary) {
    return 0n;
  }

  const [row] = await tx
    .select({
      creditMinor: sql<string>`COALESCE(sum(${journalLine.creditMinor}), 0)::text`,
      debitMinor: sql<string>`COALESCE(sum(${journalLine.debitMinor}), 0)::text`,
      normalBalance: ledgerAccount.normalBalance
    })
    .from(journalLine)
    .innerJoin(
      journalEntry,
      and(
        eq(journalEntry.organizationId, journalLine.organizationId),
        eq(journalEntry.id, journalLine.journalEntryId)
      )
    )
    .innerJoin(
      ledgerAccount,
      and(
        eq(ledgerAccount.organizationId, journalLine.organizationId),
        eq(ledgerAccount.id, journalLine.accountId)
      )
    )
    .where(
      and(
        eq(journalLine.organizationId, input.organizationId),
        eq(journalLine.accountId, input.accountId),
        balanceBoundary
      )
    )
    .groupBy(ledgerAccount.normalBalance)
    .limit(1);

  if (!row) {
    return 0n;
  }

  return toNormalBalanceMinor(BigInt(row.debitMinor), BigInt(row.creditMinor), row.normalBalance);
}

function buildPostedLineConditions(input: AccountingReportDbInput): SQL[] {
  const conditions = [eq(journalLine.organizationId, input.organizationId)];

  if (input.fromDate) {
    conditions.push(gte(journalEntry.postingDate, input.fromDate));
  }

  if (input.toDate) {
    conditions.push(lte(journalEntry.postingDate, input.toDate));
  }

  return conditions;
}

function buildAfterCursorCondition(cursor: GeneralLedgerCursor): SQL {
  return sql`(${journalEntry.postingDate}, ${journalEntry.entryNumber}, ${journalEntry.id}, ${journalLine.lineNumber}) > (${cursor.postingDate}, ${cursor.entryNumber}, ${cursor.journalEntryId}, ${cursor.lineNumber})`;
}

async function assertGeneralLedgerCursorAnchorExists(
  tx: TransactionClient,
  input: GeneralLedgerDbInput,
  cursor: GeneralLedgerCursor
): Promise<void> {
  const conditions = buildPostedLineConditions(input);

  const [row] = await tx
    .select({ id: journalLine.id })
    .from(journalLine)
    .innerJoin(
      journalEntry,
      and(
        eq(journalEntry.organizationId, journalLine.organizationId),
        eq(journalEntry.id, journalLine.journalEntryId)
      )
    )
    .where(
      and(
        ...conditions,
        eq(journalLine.accountId, input.accountId),
        eq(journalEntry.id, cursor.journalEntryId),
        eq(journalEntry.entryNumber, cursor.entryNumber),
        eq(journalEntry.postingDate, cursor.postingDate),
        eq(journalLine.lineNumber, cursor.lineNumber)
      )
    )
    .limit(1);

  if (!row) {
    throw invalidCursorError();
  }
}

function encodeGeneralLedgerCursor(
  line: GeneralLedgerRunningLine,
  input: GeneralLedgerDbInput
): string {
  const payload: GeneralLedgerCursorPayload = {
    accountId: input.accountId,
    entryNumber: line.entryNumber,
    fromDate: input.fromDate,
    journalEntryId: line.journalEntryId,
    lineNumber: line.lineNumber,
    postingDate: line.postingDate,
    runningBalanceMinor: line.runningBalanceMinor.toString(),
    toDate: input.toDate
  };
  const payloadJson = JSON.stringify(payload);

  return Buffer.from(
    JSON.stringify({
      payload,
      signature: signCursorPayload(payloadJson)
    })
  ).toString("base64url");
}

function decodeGeneralLedgerCursor(cursor: string): GeneralLedgerCursor {
  let value: unknown;

  try {
    value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
  } catch {
    throw invalidCursorError();
  }

  if (
    !value ||
    typeof value !== "object" ||
    !("payload" in value) ||
    !("signature" in value) ||
    !value.payload ||
    typeof value.payload !== "object" ||
    typeof value.signature !== "string"
  ) {
    throw invalidCursorError();
  }

  const payload = value.payload;
  if (
    !("accountId" in payload) ||
    !("entryNumber" in payload) ||
    !("journalEntryId" in payload) ||
    !("lineNumber" in payload) ||
    !("postingDate" in payload) ||
    !("runningBalanceMinor" in payload) ||
    typeof payload.accountId !== "string" ||
    typeof payload.entryNumber !== "string" ||
    typeof payload.journalEntryId !== "string" ||
    typeof payload.lineNumber !== "number" ||
    typeof payload.postingDate !== "string" ||
    typeof payload.runningBalanceMinor !== "string" ||
    !/^-?\d+$/.test(payload.runningBalanceMinor) ||
    ("fromDate" in payload && typeof payload.fromDate !== "string") ||
    ("toDate" in payload && typeof payload.toDate !== "string")
  ) {
    throw invalidCursorError();
  }

  const payloadJson = JSON.stringify(payload);
  if (!verifyCursorSignature(payloadJson, value.signature)) {
    throw invalidCursorError();
  }

  const fromDate =
    "fromDate" in payload && typeof payload.fromDate === "string" ? payload.fromDate : undefined;
  const toDate =
    "toDate" in payload && typeof payload.toDate === "string" ? payload.toDate : undefined;

  return {
    accountId: payload.accountId,
    entryNumber: payload.entryNumber,
    fromDate,
    journalEntryId: payload.journalEntryId,
    lineNumber: payload.lineNumber,
    postingDate: payload.postingDate,
    runningBalanceMinor: BigInt(payload.runningBalanceMinor),
    toDate
  };
}

function assertGeneralLedgerCursorMatchesInput(
  cursor: GeneralLedgerCursor,
  input: GeneralLedgerDbInput
): void {
  if (
    cursor.accountId !== input.accountId ||
    cursor.fromDate !== input.fromDate ||
    cursor.toDate !== input.toDate
  ) {
    throw invalidCursorError();
  }
}

function invalidCursorError(): AccountingDbError {
  return new AccountingDbError("GENERAL_LEDGER_CURSOR_INVALID");
}

function signCursorPayload(payloadJson: string): string {
  return createHmac("sha256", getCursorSigningSecret()).update(payloadJson).digest("base64url");
}

function verifyCursorSignature(payloadJson: string, signature: string): boolean {
  const expected = Buffer.from(signCursorPayload(payloadJson), "base64url");
  const actual = Buffer.from(signature, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getCursorSigningSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET is required for general ledger cursor signing");
  }

  return secret;
}
