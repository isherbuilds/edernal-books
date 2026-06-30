import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
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
  getGeneralLedger,
  getTrialBalance,
  listAccountingPeriods,
  listLedgerAccounts,
  listRecentJournalEntries,
  postJournalEntry,
  reverseJournalEntry
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

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
      .output(PostedJournalEntrySchema)
      .handler(({ context, input }) =>
        postJournalEntry(context.db, {
          description: input.description,
          lines: input.lines.map((line) => {
            return {
              accountId: line.accountId,
              amountMinor: BigInt(line.amountMinor),
              description: line.description,
              side: line.side
            };
          }),
          organizationId: context.organizationId,
          postingDate: input.postingDate,
          userId: context.authSession.user.id
        })
      ),
    reverse: organizationPermissionProcedure(ReverseJournalEntryInputSchema, canAccessAccounting)
      .route({
        description: "Post a reversing journal entry transactionally",
        method: "POST"
      })
      .output(PostedJournalEntrySchema)
      .handler(({ context, input }) =>
        reverseJournalEntry(context.db, {
          description: input.description,
          journalEntryId: input.journalEntryId,
          organizationId: context.organizationId,
          postingDate: input.postingDate,
          userId: context.authSession.user.id
        })
      )
  },
  reports: {
    generalLedger: organizationPermissionProcedure(GeneralLedgerInputSchema, canAccessAccounting)
      .route({
        description: "Read organization-scoped posted general ledger lines",
        method: "GET"
      })
      .output(GeneralLedgerOutputSchema)
      .handler(async ({ context, input }) => {
        const report = await getGeneralLedger(context.db, {
          accountId: input.accountId,
          cursor: input.cursor,
          fromDate: input.fromDate,
          limit: input.limit,
          organizationId: context.organizationId,
          toDate: input.toDate
        });

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
