import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  type AccountingErrorCode,
  AccountingErrorCodeSchema,
  GeneralLedgerInputSchema,
  GeneralLedgerOutputSchema,
  ListAccountingPeriodsInputSchema,
  ListAccountingPeriodsOutputSchema,
  ListJournalEntriesInputSchema,
  ListJournalEntriesOutputSchema,
  ListLedgerAccountsInputSchema,
  ListLedgerAccountsOutputSchema,
  PostedJournalEntrySchema,
  PostJournalEntryInputSchema,
  ReverseJournalEntryInputSchema,
  TrialBalanceInputSchema,
  TrialBalanceOutputSchema
} from "@tsu-stack/core/accounting";
import {
  AccountingDbError,
  getGeneralLedger,
  getTrialBalance,
  listAccountingPeriods,
  listLedgerAccounts,
  listRecentJournalEntries,
  postJournalEntry,
  reverseJournalEntry
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

const accountingErrorDataSchema = z.object({
  code: AccountingErrorCodeSchema
});

type AccountingErrorDefinition = {
  data: typeof accountingErrorDataSchema;
  status: 400 | 404 | 409 | 422;
};

const accountingErrors = Object.fromEntries(
  AccountingErrorCodeSchema.options.map((code) => [
    code,
    {
      data: accountingErrorDataSchema,
      status: statusForAccountingError(code)
    }
  ])
) as Record<AccountingErrorCode, AccountingErrorDefinition>;

type AccountingErrorFactories = Record<
  AccountingErrorCode,
  (input: { data: { code: AccountingErrorCode } }) => unknown
>;

export const accountingRouter = {
  chart: {
    list: organizationPermissionProcedure(ListLedgerAccountsInputSchema, canAccessAccounting)
      .route({
        description: "List organization ledger accounts",
        method: "GET"
      })
      .output(ListLedgerAccountsOutputSchema)
      .handler(async ({ context, input }) => {
        const accounts = await listLedgerAccounts(context.db, {
          organizationId: context.organizationId,
          q: input.q
        });

        return { accounts };
      })
  },
  periods: {
    list: organizationPermissionProcedure(ListAccountingPeriodsInputSchema, canAccessAccounting)
      .route({
        description: "List organization accounting periods",
        method: "GET"
      })
      .output(ListAccountingPeriodsOutputSchema)
      .handler(async ({ context }) => {
        const periods = await listAccountingPeriods(context.db, {
          organizationId: context.organizationId
        });

        return { periods };
      })
  },
  journalEntries: {
    list: organizationPermissionProcedure(ListJournalEntriesInputSchema, canAccessAccounting)
      .route({
        description: "List recent organization journal entries",
        method: "GET"
      })
      .output(ListJournalEntriesOutputSchema)
      .handler(async ({ context, input }) => {
        const entries = await listRecentJournalEntries(context.db, {
          limit: input.limit,
          organizationId: context.organizationId
        });

        return { entries };
      }),
    post: organizationPermissionProcedure(PostJournalEntryInputSchema, canAccessAccounting)
      .route({
        description: "Post a balanced journal entry transactionally",
        method: "POST"
      })
      .errors(accountingErrors)
      .output(PostedJournalEntrySchema)
      .handler(async ({ context, errors, input }) => {
        try {
          return await postJournalEntry(context.db, {
            description: input.description,
            lines: input.lines.map((line) => {
              return {
                accountId: line.accountId,
                amountMinor: BigInt(line.amountMinor),
                description: line.description,
                side: line.side
              };
            }),
            operationKey: input.operationKey,
            organizationId: context.organizationId,
            postingDate: input.postingDate,
            userId: context.authSession.user.id
          });
        } catch (error) {
          throwAccountingDbError(errors, error);
        }
      }),
    reverse: organizationPermissionProcedure(ReverseJournalEntryInputSchema, canAccessAccounting)
      .route({
        description: "Post a reversing journal entry transactionally",
        method: "POST"
      })
      .errors(accountingErrors)
      .output(PostedJournalEntrySchema)
      .handler(async ({ context, errors, input }) => {
        try {
          return await reverseJournalEntry(context.db, {
            description: input.description,
            journalEntryId: input.journalEntryId,
            operationKey: input.operationKey,
            organizationId: context.organizationId,
            postingDate: input.postingDate,
            userId: context.authSession.user.id
          });
        } catch (error) {
          throwAccountingDbError(errors, error);
        }
      })
  },
  reports: {
    generalLedger: organizationPermissionProcedure(GeneralLedgerInputSchema, canAccessAccounting)
      .route({
        description: "Read organization-scoped posted general ledger lines",
        method: "GET"
      })
      .errors(accountingErrors)
      .output(GeneralLedgerOutputSchema)
      .handler(async ({ context, errors, input }) => {
        let report: Awaited<ReturnType<typeof getGeneralLedger>>;

        try {
          report = await getGeneralLedger(context.db, {
            accountId: input.accountId,
            cursor: input.cursor,
            fromDate: input.fromDate,
            limit: input.limit,
            organizationId: context.organizationId,
            toDate: input.toDate
          });
        } catch (error) {
          throwAccountingDbError(errors, error);
        }

        return {
          closingBalanceMinor: report.closingBalanceMinor.toString(),
          lines: report.lines.map((line) => {
            return {
              accountCode: line.accountCode,
              accountId: line.accountId,
              accountName: line.accountName,
              creditMinor: line.creditMinor.toString(),
              debitMinor: line.debitMinor.toString(),
              description: line.description,
              entryNumber: line.entryNumber,
              journalEntryId: line.journalEntryId,
              lineNumber: line.lineNumber,
              normalBalance: line.normalBalance,
              postingDate: line.postingDate,
              runningBalanceMinor: line.runningBalanceMinor.toString()
            };
          }),
          nextCursor: report.nextCursor,
          openingBalanceMinor: report.openingBalanceMinor.toString()
        };
      }),
    trialBalance: organizationPermissionProcedure(TrialBalanceInputSchema, canAccessAccounting)
      .route({
        description: "Read an organization-scoped trial balance from posted lines",
        method: "GET"
      })
      .output(TrialBalanceOutputSchema)
      .handler(async ({ context, input }) => {
        const report = await getTrialBalance(context.db, {
          asOfDate: input.asOfDate,
          organizationId: context.organizationId
        });

        return {
          accounts: report.accounts.map((account) => {
            return {
              accountCategory: account.accountCategory,
              accountCode: account.accountCode,
              accountId: account.accountId,
              accountName: account.accountName,
              balanceMinor: account.balanceMinor.toString(),
              creditMinor: account.creditMinor.toString(),
              debitMinor: account.debitMinor.toString(),
              normalBalance: account.normalBalance
            };
          }),
          isBalanced: report.isBalanced,
          totalCreditMinor: report.totalCreditMinor.toString(),
          totalDebitMinor: report.totalDebitMinor.toString()
        };
      })
  }
};

function throwAccountingDbError(errors: AccountingErrorFactories, error: unknown): never {
  if (error instanceof AccountingDbError) {
    throw errors[error.code]({ data: { code: error.code } });
  }

  throw error;
}

function statusForAccountingError(code: AccountingErrorCode): 400 | 404 | 409 | 422 {
  switch (code) {
    case "GENERAL_LEDGER_CURSOR_INVALID":
      return 400;
    case "ACCOUNTING_PERIOD_NOT_FOUND":
    case "JOURNAL_ENTRY_NOT_FOUND":
      return 404;
    case "ACCOUNTING_PERIOD_CLOSED":
    case "FISCAL_YEAR_OVERLAPS":
    case "JOURNAL_ENTRY_ALREADY_REVERSED":
    case "JOURNAL_OPERATION_KEY_ALREADY_USED":
    case "JOURNAL_OPERATION_KEY_PAYLOAD_MISMATCH":
    case "NUMBER_SEQUENCE_NOT_FOUND":
      return 409;
    case "FISCAL_YEAR_DATE_RANGE_INVALID":
    case "JOURNAL_ENTRY_NEEDS_TWO_LINES":
    case "JOURNAL_ENTRY_NOT_BALANCED":
    case "JOURNAL_ENTRY_LINE_ACCOUNT_NOT_POSTABLE":
    case "JOURNAL_ENTRY_LINE_HAS_DEBIT_AND_CREDIT":
    case "JOURNAL_ENTRY_LINE_HAS_NO_AMOUNT":
    case "JOURNAL_ENTRY_LINE_NEGATIVE_AMOUNT":
      return 422;
  }
}
