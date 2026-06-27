import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { type Database } from "#@/client";
import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { organization, user } from "#@/schema/auth.schema";
import { organizationSetting } from "#@/schema/organization";
import { accountingPeriod } from "#@/schema/periods";

import {
  type AccountingDbError,
  type PostJournalEntryDbInput,
  createFiscalYear,
  postJournalEntry,
  reverseJournalEntry,
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
  it("returns an idempotent duplicate result without allocating another number", async () => {
    const context = await createAccountingContext();

    try {
      const input = makeJournalInput(context, "duplicate");
      const posted = await postJournalEntry(integrationDb, input);
      const duplicate = await postJournalEntry(integrationDb, input);

      expect(posted).toMatchObject({
        entryNumber: "JV-25-26-000001",
        replayed: false
      });
      expect(duplicate).toEqual({
        entryNumber: posted.entryNumber,
        journalEntryId: posted.journalEntryId,
        replayed: true
      });

      const [sequence] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, context.organizationId));

      expect(sequence?.nextNumber).toBe(2n);
    } finally {
      await context.cleanup();
    }
  });

  it("rejects operation-key reuse with a different payload", async () => {
    const context = await createAccountingContext();

    try {
      const input = makeJournalInput(context, "payload-conflict");
      await postJournalEntry(integrationDb, input);

      await expect(
        postJournalEntry(integrationDb, {
          ...input,
          description: "Different payload"
        })
      ).rejects.toMatchObject({
        code: "JOURNAL_OPERATION_KEY_PAYLOAD_MISMATCH"
      } satisfies Partial<AccountingDbError>);
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

  it("returns duplicate replay for concurrent identical operation keys", async () => {
    const context = await createAccountingContext();

    try {
      const input = makeJournalInput(context, "same-key-concurrent");
      const posted = await Promise.all([
        postJournalEntry(integrationDb, input),
        postJournalEntry(integrationDb, input)
      ]);
      const journalEntryIds = new Set(posted.map((entry) => entry.journalEntryId));

      expect(journalEntryIds.size).toBe(1);
      expect(posted.some((entry) => entry.replayed)).toBe(true);

      const [sequence] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, context.organizationId));

      expect(sequence?.nextNumber).toBe(2n);
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

  it("rejects duplicate operation keys across fiscal years with different payloads", async () => {
    const context = await createAccountingContext();

    try {
      await createFiscalYear(integrationDb, {
        endDate: "2027-03-31",
        organizationId: context.organizationId,
        startDate: "2026-04-01",
        userId: context.userId
      });

      const operationKey = `integration:${context.organizationId}:same-key-across-years`;
      const attempts = await Promise.allSettled([
        postJournalEntry(integrationDb, {
          ...makeJournalInput(context, "same-key-across-years", "2025-04-15"),
          operationKey
        }),
        postJournalEntry(integrationDb, {
          ...makeJournalInput(context, "same-key-across-years", "2026-04-15"),
          operationKey
        })
      ]);
      const rejected = attempts.filter((attempt) => attempt.status === "rejected");

      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toMatchObject({
        reason: { code: "JOURNAL_OPERATION_KEY_PAYLOAD_MISMATCH" },
        status: "rejected"
      });

      const sequences = await integrationDb
        .select({
          fiscalYearId: numberSequence.fiscalYearId,
          nextNumber: numberSequence.nextNumber
        })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, context.organizationId));

      const nextNumbers = sequences.map((sequence) => sequence.nextNumber);
      nextNumbers.sort((left, right) => Number(left - right));
      expect(nextNumbers).toEqual([1n, 2n]);
    } finally {
      await context.cleanup();
    }
  });

  it("rolls back sequence allocation when posting fails after allocation", async () => {
    const context = await createAccountingContext();

    try {
      await expect(
        rejectionMessageFor(
          postJournalEntry(integrationDb, {
            ...makeJournalInput(context, "rollback-fails"),
            sourceDocumentId: randomUUID()
          })
        )
      ).resolves.toMatch(/foreign key|source_document/);

      const [sequenceAfterFailure] = await integrationDb
        .select({ nextNumber: numberSequence.nextNumber })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, context.organizationId));
      expect(sequenceAfterFailure?.nextNumber).toBe(1n);

      const posted = await postJournalEntry(
        integrationDb,
        makeJournalInput(context, "rollback-succeeds")
      );
      expect(posted.entryNumber).toBe("JV-25-26-000001");
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
        operationKey: `integration:${context.organizationId}:reverse-1`,
        organizationId: context.organizationId,
        postingDate: "2025-04-20",
        userId: context.userId
      });

      expect(reversed.entryNumber).toBe("JV-25-26-000002");

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse original integration entry again",
          journalEntryId: posted.journalEntryId,
          operationKey: `integration:${context.organizationId}:reverse-2`,
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

  it("rejects reversing a reversal entry", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(integrationDb, makeJournalInput(context, "original"));
      const reversed = await reverseJournalEntry(integrationDb, {
        description: "Reverse original integration entry",
        journalEntryId: posted.journalEntryId,
        operationKey: `integration:${context.organizationId}:reverse-1`,
        organizationId: context.organizationId,
        postingDate: "2025-04-20",
        userId: context.userId
      });

      await expect(
        reverseJournalEntry(integrationDb, {
          description: "Reverse the reversal",
          journalEntryId: reversed.journalEntryId,
          operationKey: `integration:${context.organizationId}:reverse-reversal`,
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

  it("allows only one concurrent reversal with distinct operation keys", async () => {
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
            operationKey: `integration:${context.organizationId}:concurrent-reversal-${index + 1}`,
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

  it("replays duplicate reversal operation keys without posting another reversal", async () => {
    const context = await createAccountingContext();

    try {
      const posted = await postJournalEntry(integrationDb, makeJournalInput(context, "original"));
      const input = {
        description: "Reverse original integration entry again",
        journalEntryId: posted.journalEntryId,
        operationKey: `integration:${context.organizationId}:reverse-1`,
        organizationId: context.organizationId,
        postingDate: "2025-04-20",
        userId: context.userId
      };

      const reversed = await reverseJournalEntry(integrationDb, input);
      const replayed = await reverseJournalEntry(integrationDb, input);

      expect(replayed).toEqual({
        entryNumber: reversed.entryNumber,
        journalEntryId: reversed.journalEntryId,
        replayed: true
      });
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
      ).rejects.toMatchObject({
        code: "GENERAL_LEDGER_CURSOR_INVALID"
      } satisfies Partial<AccountingDbError>);
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
      ).rejects.toMatchObject({
        code: "GENERAL_LEDGER_CURSOR_INVALID"
      } satisfies Partial<AccountingDbError>);
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
      const [sequence] = await integrationDb
        .select({ prefix: numberSequence.prefix })
        .from(numberSequence)
        .where(eq(numberSequence.organizationId, organizationId));

      expect(periods).toHaveLength(10);
      expect(periods[0]).toEqual({
        endDate: "2026-06-30",
        startDate: "2026-06-26"
      });
      expect(sequence?.prefix).toBe("JV-26-27-");
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
  operationKeySuffix: string,
  postingDate = "2025-04-15"
): PostJournalEntryDbInput {
  return {
    description: `Integration ${operationKeySuffix}`,
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
    operationKey: `integration:${context.organizationId}:${operationKeySuffix}`,
    organizationId: context.organizationId,
    postingDate,
    userId: context.userId
  };
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
