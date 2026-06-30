import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { type Database } from "#@/client";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { organization, user } from "#@/schema/auth.schema";
import { journalEntry } from "#@/schema/journal";
import { organizationSetting } from "#@/schema/organization";
import { accountingPeriod } from "#@/schema/periods";

import {
  type AccountingDbError,
  type PostJournalEntryDbInput,
  type PostJournalEntryInTransactionInput,
  createFiscalYear,
  postJournalEntry,
  postJournalEntryInTransaction,
  reverseJournalEntry,
  reverseJournalEntryInTransaction,
  setupOrganizationAccountingDefaults
} from "./accounting";
import { getGeneralLedger } from "./accounting-reports";
import { seedSupportedCurrencies } from "./currency";

const shouldRunIntegration = process.env.DB_INTEGRATION_TESTS === "1";
const describeIntegration = shouldRunIntegration ? describe : describe.skip;

let integrationDb: Database;
let closeIntegrationDb: (() => Promise<void>) | undefined;

beforeAll(async () => {
  if (!shouldRunIntegration) {
    return;
  }

  const client = await import("#@/client");
  integrationDb = client.db;
  closeIntegrationDb = client.closeDb;
});

afterAll(async () => {
  await closeIntegrationDb?.();
});

describeIntegration("accounting kernel database integration", () => {
  it("allocates a new number for each posted journal command", async () => {
    const context = await createAccountingContext();

    try {
      const input = makeJournalInput(context, "duplicate");
      const posted = await postJournalEntry(integrationDb, input);
      const next = await postJournalEntry(integrationDb, input);

      expect(posted).toMatchObject({
        entryNumber: "JV-25-26-000001"
      });
      expect(next).toMatchObject({
        entryNumber: "JV-25-26-000002"
      });
      expect(next.journalEntryId).not.toBe(posted.journalEntryId);

      const [sequence] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(
          and(
            eq(numberSequence.entityType, "journal_entry"),
            eq(numberSequence.organizationId, context.organizationId)
          )
        );

      expect(sequence?.nextNumber).toBe(3n);
    } finally {
      await context.cleanup();
    }
  });

  it("allocates concurrent journal numbers atomically", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          postJournalEntry(integrationDb, makeJournalInput(context, `concurrent-${index + 1}`))
        )
      );

      const entryNumbers = posted.map((entry) => entry.entryNumber);
      entryNumbers.sort();
      expect(entryNumbers).toEqual([
        "JV-25-26-000001",
        "JV-25-26-000002",
        "JV-25-26-000003",
        "JV-25-26-000004",
        "JV-25-26-000005"
      ]);
      expect(new Set(entryNumbers).size).toBe(entryNumbers.length);
    } finally {
      await context.cleanup();
    }
  });

  it("resets journal sequence per fiscal year without entry number collisions", async () => {
    const context = await createAccountingContext();

    try {
      await createFiscalYear(integrationDb, {
        endDate: "2027-03-31",
        organizationId: context.organizationId,
        startDate: "2026-04-01",
        userId: context.userId
      });

      const first = await postJournalEntry(integrationDb, makeJournalInput(context, "fy-1"));
      const second = await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "fy-2", "2026-04-15")
      );

      expect(first.entryNumber).toBe("JV-25-26-000001");
      expect(second.entryNumber).toBe("JV-26-27-000001");
    } finally {
      await context.cleanup();
    }
  });

  it("rolls back sequence allocation when duplicate source posting fails after allocation", async () => {
    const context = await createAccountingContext();

    try {
      const source = {
        number: "INV-TEST-001",
        recordId: randomUUID(),
        type: "sales_invoice"
      } satisfies NonNullable<PostJournalEntryInTransactionInput["source"]>;
      const original = await postDocumentWorkflowJournal({
        ...makeJournalInput(context, "rollback-original"),
        postingOrigin: "document_workflow",
        source
      });

      expect(original.entryNumber).toBe("JV-25-26-000001");

      await expect(
        rejectionMessageFor(
          postDocumentWorkflowJournal({
            ...makeJournalInput(context, "rollback-fails"),
            postingOrigin: "document_workflow",
            source
          })
        )
      ).resolves.toMatch(/journal_entry_one_original_per_source_uidx|duplicate key/);

      const [sequenceAfterFailure] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(
          and(
            eq(numberSequence.entityType, "journal_entry"),
            eq(numberSequence.organizationId, context.organizationId)
          )
        );
      expect(sequenceAfterFailure?.nextNumber).toBe(2n);

      const posted = await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "rollback-succeeds")
      );
      expect(posted.entryNumber).toBe("JV-25-26-000002");
    } finally {
      await context.cleanup();
    }
  });

  it("keeps public journal posting manual-only even when internal fields are present", async () => {
    const context = await createAccountingContext();

    try {
      const source = {
        number: "INV-TEST-PUBLIC",
        recordId: randomUUID(),
        type: "sales_invoice"
      } satisfies NonNullable<PostJournalEntryInTransactionInput["source"]>;
      const injectedInput = {
        ...makeJournalInput(context, "public-boundary"),
        postingOrigin: "document_workflow",
        source
      } as PostJournalEntryDbInput &
        Pick<PostJournalEntryInTransactionInput, "postingOrigin" | "source">;

      const posted = await postJournalEntry(integrationDb, injectedInput);
      const [entry] = await integrationDb
        .select({
          sourceNumber: journalEntry.sourceNumber,
          sourceRecordId: journalEntry.sourceRecordId,
          sourceType: journalEntry.sourceType
        })
        .from(journalEntry)
        .where(eq(journalEntry.id, posted.journalEntryId))
        .limit(1);

      expect(entry).toEqual({
        sourceNumber: null,
        sourceRecordId: null,
        sourceType: null
      });

      const [receivableAccount] = await integrationDb
        .select({ id: ledgerAccount.id })
        .from(ledgerAccount)
        .where(
          and(
            eq(ledgerAccount.organizationId, context.organizationId),
            eq(ledgerAccount.systemKey, "accounts_receivable")
          )
        )
        .limit(1);

      if (!receivableAccount) {
        throw new Error("Missing accounts receivable account");
      }

      await expect(
        postJournalEntry(integrationDb, {
          ...injectedInput,
          lines: [
            {
              accountId: receivableAccount.id,
              amountMinor: 10000n,
              side: "debit"
            },
            {
              accountId: context.equityAccountId,
              amountMinor: 10000n,
              side: "credit"
            }
          ]
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_LINE_ACCOUNT_NOT_POSTABLE"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects posting dates without an accounting period", async () => {
    const context = await createAccountingContext();

    try {
      await expect(
        postJournalEntry(integrationDb, makeJournalInput(context, "missing-period", "2024-12-15"))
      ).rejects.toMatchObject({
        code: "ACCOUNTING_PERIOD_NOT_FOUND"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects unbalanced entries before insert", async () => {
    const context = await createAccountingContext();

    try {
      const input = makeJournalInput(context, "unbalanced");
      input.lines[1].amountMinor = 9000n;

      await expect(postJournalEntry(integrationDb, input)).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_NOT_BALANCED"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects reversing an entry more than once", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(integrationDb, makeJournalInput(context, "original"));
      const reversed = await reverseJournalEntry(integrationDb, {
        description: "Reverse original integration entry",
        journalEntryId: posted.journalEntryId,
        organizationId: context.organizationId,
        postingDate: "2025-04-20",
        userId: context.userId
      });

      expect(reversed.entryNumber).toBe("JV-25-26-000002");

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse original integration entry again",
          journalEntryId: posted.journalEntryId,
          organizationId: context.organizationId,
          postingDate: "2025-04-21",
          userId: context.userId
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_ALREADY_REVERSED"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects reversing before original posting date", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "original", "2025-04-20")
      );

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse original integration entry",
          journalEntryId: posted.journalEntryId,
          organizationId: context.organizationId,
          postingDate: "2025-04-19",
          userId: context.userId
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_REVERSAL_DATE_INVALID"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects public reversal of sourced document journals", async () => {
    const context = await createAccountingContext();

    try {
      const source = {
        number: "INV-TEST-002",
        recordId: randomUUID(),
        type: "sales_invoice"
      } satisfies NonNullable<PostJournalEntryInTransactionInput["source"]>;
      const posted = await postDocumentWorkflowJournal({
        ...makeJournalInput(context, "source-copy-original"),
        postingOrigin: "document_workflow",
        source
      });

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse source-copy original",
          journalEntryId: posted.journalEntryId,
          organizationId: context.organizationId,
          postingDate: "2025-04-20",
          userId: context.userId
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_SOURCED_REVERSAL_FORBIDDEN"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("copies journal source metadata when internal sourced reversal is allowed", async () => {
    const context = await createAccountingContext();

    try {
      const source = {
        number: "INV-TEST-002",
        recordId: randomUUID(),
        type: "sales_invoice"
      } satisfies NonNullable<PostJournalEntryInTransactionInput["source"]>;
      const posted = await postDocumentWorkflowJournal({
        ...makeJournalInput(context, "source-copy-original"),
        postingOrigin: "document_workflow",
        source
      });
      const reversed = await integrationDb.transaction((tx) =>
        reverseJournalEntryInTransaction(tx, {
          allowSourcedEntry: true,
          description: "Reverse source-copy original",
          journalEntryId: posted.journalEntryId,
          organizationId: context.organizationId,
          postingDate: "2025-04-20",
          userId: context.userId
        })
      );

      const entries = await integrationDb
        .select({
          id: journalEntry.id,
          reversalOfEntryId: journalEntry.reversalOfEntryId,
          sourceNumber: journalEntry.sourceNumber,
          sourceRecordId: journalEntry.sourceRecordId,
          sourceType: journalEntry.sourceType
        })
        .from(journalEntry)
        .where(
          and(
            eq(journalEntry.organizationId, context.organizationId),
            inArray(journalEntry.id, [posted.journalEntryId, reversed.journalEntryId])
          )
        )
        .orderBy(asc(journalEntry.entryNumber));

      expect(entries).toEqual([
        {
          id: posted.journalEntryId,
          reversalOfEntryId: null,
          sourceNumber: source.number,
          sourceRecordId: source.recordId,
          sourceType: source.type
        },
        {
          id: reversed.journalEntryId,
          reversalOfEntryId: posted.journalEntryId,
          sourceNumber: source.number,
          sourceRecordId: source.recordId,
          sourceType: source.type
        }
      ]);
      await expect(
        rejectionMessageFor(
          postDocumentWorkflowJournal({
            ...makeJournalInput(context, "source-copy-duplicate"),
            postingOrigin: "document_workflow",
            source
          })
        )
      ).resolves.toMatch(/journal_entry_one_original_per_source_uidx|duplicate key/);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects reversing a reversal entry", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(integrationDb, makeJournalInput(context, "original"));
      const reversed = await reverseJournalEntry(integrationDb, {
        description: "Reverse original integration entry",
        journalEntryId: posted.journalEntryId,
        organizationId: context.organizationId,
        postingDate: "2025-04-20",
        userId: context.userId
      });

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse the reversal",
          journalEntryId: reversed.journalEntryId,
          organizationId: context.organizationId,
          postingDate: "2025-04-21",
          userId: context.userId
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_ENTRY_ALREADY_REVERSED"
      } satisfies Partial<AccountingDbError>);
    } finally {
      await context.cleanup();
    }
  });

  it("allows only one concurrent reversal", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "concurrent-reversal-original")
      );
      const attempts = await Promise.allSettled(
        Array.from({ length: 5 }, (_, index) =>
          reverseJournalEntry(integrationDb, {
            description: `Concurrent reversal ${index + 1}`,
            journalEntryId: posted.journalEntryId,
            organizationId: context.organizationId,
            postingDate: "2025-04-20",
            userId: context.userId
          })
        )
      );

      const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
      const rejected = attempts.filter((attempt) => attempt.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      for (const attempt of rejected) {
        expect(attempt).toMatchObject({
          reason: { code: "JOURNAL_ENTRY_ALREADY_REVERSED" },
          status: "rejected"
        });
      }
    } finally {
      await context.cleanup();
    }
  });

  it("carries general-ledger running balance through the cursor", async () => {
    const context = await createAccountingContext();

    try {
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-page-1"));
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-page-2"));
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-page-3"));

      const firstPage = await getGeneralLedger(integrationDb, {
        accountId: context.bankAccountId,
        limit: 2,
        organizationId: context.organizationId
      });

      expect(firstPage.openingBalanceMinor).toBe(0n);
      expect(firstPage.lines.map((line) => line.runningBalanceMinor)).toEqual([10000n, 20000n]);
      expect(firstPage.nextCursor).toEqual(expect.any(String));

      const secondPage = await getGeneralLedger(integrationDb, {
        accountId: context.bankAccountId,
        cursor: firstPage.nextCursor ?? undefined,
        limit: 2,
        organizationId: context.organizationId
      });

      expect(secondPage.openingBalanceMinor).toBe(20000n);
      expect(secondPage.lines.map((line) => line.runningBalanceMinor)).toEqual([30000n]);
      expect(secondPage.nextCursor).toBeNull();
    } finally {
      await context.cleanup();
    }
  });

  it("keeps general-ledger cursor balance anchored to the filtered opening balance", async () => {
    const context = await createAccountingContext();

    try {
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-before-range"));
      await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "gl-range-page-1", "2025-04-16")
      );
      await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "gl-range-page-2", "2025-04-17")
      );

      const firstPage = await getGeneralLedger(integrationDb, {
        accountId: context.bankAccountId,
        fromDate: "2025-04-16",
        limit: 1,
        organizationId: context.organizationId
      });

      expect(firstPage.openingBalanceMinor).toBe(10000n);
      expect(firstPage.lines.map((line) => line.runningBalanceMinor)).toEqual([20000n]);
      expect(firstPage.nextCursor).toEqual(expect.any(String));

      const secondPage = await getGeneralLedger(integrationDb, {
        accountId: context.bankAccountId,
        cursor: firstPage.nextCursor ?? undefined,
        fromDate: "2025-04-16",
        limit: 1,
        organizationId: context.organizationId
      });

      expect(secondPage.openingBalanceMinor).toBe(20000n);
      expect(secondPage.lines.map((line) => line.runningBalanceMinor)).toEqual([30000n]);
      expect(secondPage.nextCursor).toBeNull();
    } finally {
      await context.cleanup();
    }
  });

  it("rejects general-ledger cursors that do not point to an existing line", async () => {
    const context = await createAccountingContext();

    try {
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-invalid-cursor"));

      const cursor = Buffer.from(
        JSON.stringify({
          accountId: context.bankAccountId,
          entryNumber: "JV-25-26-999999",
          journalEntryId: randomUUID(),
          lineNumber: 1,
          postingDate: "2025-04-30"
        })
      ).toString("base64url");

      await expect(
        getGeneralLedger(integrationDb, {
          accountId: context.bankAccountId,
          cursor,
          limit: 1,
          organizationId: context.organizationId
        })
      ).rejects.toThrow("CURSOR_INVALID");
    } finally {
      await context.cleanup();
    }
  });

  it("rejects tampered general-ledger cursor balances", async () => {
    const context = await createAccountingContext();

    try {
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-tamper-1"));
      await postJournalEntry(integrationDb, makeJournalInput(context, "gl-tamper-2"));

      const firstPage = await getGeneralLedger(integrationDb, {
        accountId: context.bankAccountId,
        limit: 1,
        organizationId: context.organizationId
      });
      const cursor = firstPage.nextCursor;

      if (!cursor) {
        throw new Error("Expected a general-ledger cursor");
      }

      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        payload: { runningBalanceMinor: string };
        signature: string;
      };
      decoded.payload.runningBalanceMinor = "999999999";
      const tamperedCursor = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      await expect(
        getGeneralLedger(integrationDb, {
          accountId: context.bankAccountId,
          cursor: tamperedCursor,
          limit: 1,
          organizationId: context.organizationId
        })
      ).rejects.toThrow("Invalid general ledger cursor");
    } finally {
      await context.cleanup();
    }
  });

  it("sets up initial fiscal year and default chart during onboarding", async () => {
    await seedCurrencies();

    const testId = randomUUID();
    const userId = `test_user_${testId}`;
    const organizationId = `test_org_${testId}`;

    try {
      await integrationDb.insert(user).values({
        email: `onboarding-${testId}@example.test`,
        emailVerified: true,
        id: userId,
        name: "Onboarding Integration Test"
      });

      await integrationDb.insert(organization).values({
        createdAt: new Date(),
        id: organizationId,
        name: "Onboarding Integration Test",
        slug: `onboarding-${testId}`
      });

      await integrationDb.insert(organizationSetting).values({
        baseCurrencyCode: "INR",
        booksStartDate: "2026-06-26",
        fiscalYearStartMonth: 4,
        legalName: "Onboarding Integration Test Private Limited",
        organizationId
      });

      await integrationDb.transaction((tx) =>
        setupOrganizationAccountingDefaults(tx, {
          booksStartDate: "2026-06-26",
          initialFiscalYearEndDate: "2027-03-31",
          organizationId,
          userId
        })
      );

      const periods = await integrationDb
        .select({
          endDate: accountingPeriod.endDate,
          startDate: accountingPeriod.startDate
        })
        .from(accountingPeriod)
        .where(eq(accountingPeriod.organizationId, organizationId))
        .orderBy(asc(accountingPeriod.startDate));
      const accounts = await integrationDb
        .select({ id: ledgerAccount.id })
        .from(ledgerAccount)
        .where(eq(ledgerAccount.organizationId, organizationId));
      const sequences = await integrationDb
        .select({ entityType: numberSequence.entityType, prefix: numberSequence.prefix })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, organizationId))
        .orderBy(asc(numberSequence.entityType));

      expect(periods).toHaveLength(10);
      expect(periods[0]).toEqual({
        endDate: "2026-06-30",
        startDate: "2026-06-26"
      });
      expect(sequences).toEqual([
        { entityType: "expense", prefix: "EXP-26-27-" },
        { entityType: "journal_entry", prefix: "JV-26-27-" },
        { entityType: "purchase_bill", prefix: "BILL-26-27-" },
        { entityType: "sales_invoice", prefix: "INV-26-27-" },
        { entityType: "settlement_paid", prefix: "PAY-26-27-" },
        { entityType: "settlement_received", prefix: "RCT-26-27-" }
      ]);
      expect(accounts.length).toBeGreaterThan(0);
    } finally {
      await integrationDb.delete(organization).where(eq(organization.id, organizationId));
      await integrationDb.delete(user).where(eq(user.id, userId));
    }
  });
});

type AccountingContext = {
  bankAccountId: string;
  cleanup: () => Promise<void>;
  equityAccountId: string;
  organizationId: string;
  userId: string;
};

async function createAccountingContext(): Promise<AccountingContext> {
  await seedCurrencies();

  const testId = randomUUID();
  const userId = `test_user_${testId}`;
  const organizationId = `test_org_${testId}`;
  const createdAt = new Date();

  await integrationDb.insert(user).values({
    email: `accounting-${testId}@example.test`,
    emailVerified: true,
    id: userId,
    name: "Accounting Integration Test"
  });

  await integrationDb.insert(organization).values({
    createdAt,
    id: organizationId,
    name: "Accounting Integration Test",
    slug: `accounting-${testId}`
  });

  await integrationDb.insert(organizationSetting).values({
    baseCurrencyCode: "INR",
    booksStartDate: "2025-04-01",
    fiscalYearStartMonth: 4,
    legalName: "Accounting Integration Test Private Limited",
    organizationId
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
    .select({
      id: ledgerAccount.id,
      systemKey: ledgerAccount.systemKey
    })
    .from(ledgerAccount)
    .where(
      and(
        eq(ledgerAccount.organizationId, organizationId),
        inArray(ledgerAccount.systemKey, ["bank", "owners_equity"])
      )
    );

  const bankAccountId = accounts.find((account) => account.systemKey === "bank")?.id;
  const equityAccountId = accounts.find((account) => account.systemKey === "owners_equity")?.id;

  if (!bankAccountId || !equityAccountId) {
    throw new Error("Missing default chart accounts");
  }

  return {
    bankAccountId,
    cleanup: async () => {
      await integrationDb.delete(organization).where(eq(organization.id, organizationId));
      await integrationDb.delete(user).where(eq(user.id, userId));
    },
    equityAccountId,
    organizationId,
    userId
  };
}

async function seedCurrencies(): Promise<void> {
  await seedSupportedCurrencies(integrationDb);
}

function makeJournalInput(
  context: AccountingContext,
  descriptionSuffix: string,
  postingDate = "2025-04-15"
): PostJournalEntryDbInput {
  return {
    description: `Integration ${descriptionSuffix}`,
    lines: [
      {
        accountId: context.bankAccountId,
        amountMinor: 10000n,
        side: "debit"
      },
      {
        accountId: context.equityAccountId,
        amountMinor: 10000n,
        side: "credit"
      }
    ],
    organizationId: context.organizationId,
    postingDate,
    userId: context.userId
  };
}

async function postDocumentWorkflowJournal(input: PostJournalEntryInTransactionInput) {
  return integrationDb.transaction((tx) => postJournalEntryInTransaction(tx, input));
}

async function rejectionMessageFor(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return collectErrorMessages(error).join("\n");
  }

  throw new Error("Expected promise to reject");
}

function collectErrorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [String(error)];
  }

  const messages = [error.message];

  if (error.cause) {
    messages.push(...collectErrorMessages(error.cause));
  }

  return messages;
}
