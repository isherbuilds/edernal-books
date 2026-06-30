import { z } from "zod";

import { OrgSlugInputSchema } from "#@/organizations/index";
import { CursorPaginationInputSchema, CursorPaginationOutputSchema } from "#@/pagination";

export const ACCOUNTING_ERROR_CODES = [
  "ACCOUNTING_PERIOD_CLOSED",
  "ACCOUNTING_PERIOD_NOT_FOUND",
  "FISCAL_YEAR_DATE_RANGE_INVALID",
  "FISCAL_YEAR_OVERLAPS",
  "JOURNAL_ENTRY_ALREADY_REVERSED",
  "JOURNAL_ENTRY_NOT_FOUND",
  "JOURNAL_ENTRY_REVERSAL_DATE_INVALID",
  "JOURNAL_ENTRY_SOURCED_REVERSAL_FORBIDDEN",
  "JOURNAL_ENTRY_NEEDS_TWO_LINES",
  "JOURNAL_ENTRY_NOT_BALANCED",
  "JOURNAL_ENTRY_LINE_ACCOUNT_NOT_POSTABLE",
  "JOURNAL_ENTRY_LINE_HAS_DEBIT_AND_CREDIT",
  "JOURNAL_ENTRY_LINE_HAS_NO_AMOUNT",
  "JOURNAL_ENTRY_LINE_NEGATIVE_AMOUNT",
  "NUMBER_SEQUENCE_NOT_FOUND"
] as const;

export const ACCOUNTING_PERIOD_STATUSES = ["open", "locked", "closed"] as const;
export const FISCAL_YEAR_STATUSES = ["open", "closed"] as const;
export const JOURNAL_ENTRY_LINE_SIDES = ["debit", "credit"] as const;
export const LEDGER_ACCOUNT_CATEGORIES = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense"
] as const;
export const NORMAL_BALANCES = ["debit", "credit"] as const;
export const JOURNAL_SOURCE_TYPES = [
  "sales_invoice",
  "purchase_bill",
  "expense",
  "settlement_received",
  "settlement_paid"
] as const;

export const AccountingErrorCodeSchema = z.enum(ACCOUNTING_ERROR_CODES);
export type AccountingErrorCode = z.infer<typeof AccountingErrorCodeSchema>;

export const MinorUnitStringSchema = z
  .string()
  .regex(/^-?\d+$/)
  .refine(isPostgresBigintString);
export type MinorUnitString = z.infer<typeof MinorUnitStringSchema>;

const POSTGRES_BIGINT_MIN = "9223372036854775808";
const POSTGRES_BIGINT_MAX = "9223372036854775807";

export const NonNegativeMinorUnitStringSchema = z
  .string()
  .regex(/^\d+$/)
  .refine(isPostgresBigintString);
export type NonNegativeMinorUnitString = z.infer<typeof NonNegativeMinorUnitStringSchema>;

const positiveMinorUnitString = NonNegativeMinorUnitStringSchema.refine(
  (value) => BigInt(value) > 0n
);

export const AccountingPeriodStatusSchema = z.enum(ACCOUNTING_PERIOD_STATUSES);
export type AccountingPeriodStatus = z.infer<typeof AccountingPeriodStatusSchema>;

export const LedgerAccountCategorySchema = z.enum(LEDGER_ACCOUNT_CATEGORIES);
export type LedgerAccountCategory = z.infer<typeof LedgerAccountCategorySchema>;

export const NormalBalanceSchema = z.enum(NORMAL_BALANCES);
export type NormalBalance = z.infer<typeof NormalBalanceSchema>;

export const JournalEntryLineSideSchema = z.enum(JOURNAL_ENTRY_LINE_SIDES);
export type JournalEntryLineSide = z.infer<typeof JournalEntryLineSideSchema>;

export const JournalSourceTypeSchema = z.enum(JOURNAL_SOURCE_TYPES);
export type JournalSourceType = z.infer<typeof JournalSourceTypeSchema>;
export const JOURNAL_SOURCE_PREFIX_BY_TYPE = {
  expense: "EXP",
  purchase_bill: "BILL",
  sales_invoice: "INV",
  settlement_paid: "PAY",
  settlement_received: "RCT"
} as const satisfies Record<JournalSourceType, string>;

export const SetupFiscalYearInputSchema = OrgSlugInputSchema.extend({
  endDate: z.iso.date(),
  startDate: z.iso.date()
})
  .strict()
  .refine((input) => input.startDate <= input.endDate, {
    path: ["endDate"]
  });
export type SetupFiscalYearInput = z.infer<typeof SetupFiscalYearInputSchema>;

export const AccountingPeriodSchema = z
  .object({
    endDate: z.iso.date(),
    fiscalYearId: z.uuid(),
    id: z.uuid(),
    name: z.string().trim().min(1),
    startDate: z.iso.date(),
    status: AccountingPeriodStatusSchema
  })
  .strict();
export type AccountingPeriod = z.infer<typeof AccountingPeriodSchema>;

export const SetupFiscalYearOutputSchema = z
  .object({
    fiscalYearId: z.uuid(),
    periods: z.array(AccountingPeriodSchema).min(1)
  })
  .strict();
export type SetupFiscalYearOutput = z.infer<typeof SetupFiscalYearOutputSchema>;

export const LedgerAccountSchema = z
  .object({
    accountCategory: LedgerAccountCategorySchema,
    accountType: z.string().trim().min(1).max(80),
    allowManualPosting: z.boolean(),
    code: z.string().trim().min(1).max(40),
    id: z.uuid(),
    name: z.string().trim().min(1).max(160),
    normalBalance: NormalBalanceSchema,
    parentAccountId: z.uuid().nullable(),
    systemKey: z.string().trim().min(1).max(80).nullable()
  })
  .strict();
export type LedgerAccount = z.infer<typeof LedgerAccountSchema>;

export const ListLedgerAccountsInputSchema = OrgSlugInputSchema.extend({
  q: z.string().trim().min(1).max(80).optional()
}).strict();
export type ListLedgerAccountsInput = z.infer<typeof ListLedgerAccountsInputSchema>;

export const LedgerAccountListItemSchema = z
  .object({
    accountCategory: LedgerAccountCategorySchema,
    accountType: z.string().trim().min(1).max(80),
    active: z.boolean(),
    allowManualPosting: z.boolean(),
    code: z.string().trim().min(1).max(40),
    id: z.uuid(),
    isGroup: z.boolean(),
    name: z.string().trim().min(1).max(160),
    normalBalance: NormalBalanceSchema,
    parentAccountId: z.uuid().nullable(),
    systemKey: z.string().trim().min(1).max(80).nullable()
  })
  .strict();
export type LedgerAccountListItem = z.infer<typeof LedgerAccountListItemSchema>;

export const ListLedgerAccountsOutputSchema = z
  .object({
    accounts: z.array(LedgerAccountListItemSchema)
  })
  .strict();
export type ListLedgerAccountsOutput = z.infer<typeof ListLedgerAccountsOutputSchema>;

export const ListAccountingPeriodsInputSchema = OrgSlugInputSchema;
export type ListAccountingPeriodsInput = z.infer<typeof ListAccountingPeriodsInputSchema>;

export const ListAccountingPeriodsOutputSchema = z
  .object({
    periods: z.array(AccountingPeriodSchema)
  })
  .strict();
export type ListAccountingPeriodsOutput = z.infer<typeof ListAccountingPeriodsOutputSchema>;

export const PostJournalEntryLineInputSchema = z
  .object({
    accountId: z.uuid(),
    amountMinor: positiveMinorUnitString,
    description: z.string().trim().max(500).optional(),
    side: JournalEntryLineSideSchema
  })
  .strict();
export type PostJournalEntryLineInput = z.infer<typeof PostJournalEntryLineInputSchema>;

export const PostJournalEntryInputSchema = OrgSlugInputSchema.extend({
  description: z.string().trim().max(500).optional(),
  lines: z.array(PostJournalEntryLineInputSchema).min(2),
  postingDate: z.iso.date()
}).strict();
export type PostJournalEntryInput = z.infer<typeof PostJournalEntryInputSchema>;

export const PostedJournalEntrySchema = z
  .object({
    entryNumber: z.string().trim().min(1),
    journalEntryId: z.uuid()
  })
  .strict();
export type PostedJournalEntry = z.infer<typeof PostedJournalEntrySchema>;

export const ReverseJournalEntryInputSchema = OrgSlugInputSchema.extend({
  description: z.string().trim().min(1).max(500),
  journalEntryId: z.uuid(),
  postingDate: z.iso.date()
}).strict();
export type ReverseJournalEntryInput = z.infer<typeof ReverseJournalEntryInputSchema>;

export const ListJournalEntriesInputSchema = OrgSlugInputSchema.extend({
  limit: z.number().int().min(1).max(200).default(50)
}).strict();
export type ListJournalEntriesInput = z.infer<typeof ListJournalEntriesInputSchema>;

export const JournalEntryRegisterItemSchema = z
  .object({
    description: z.string().nullable(),
    entryNumber: z.string().trim().min(1),
    id: z.uuid(),
    postingDate: z.iso.date(),
    reversalOfEntryId: z.uuid().nullable(),
    totalMinor: MinorUnitStringSchema
  })
  .strict();
export type JournalEntryRegisterItem = z.infer<typeof JournalEntryRegisterItemSchema>;

export const ListJournalEntriesOutputSchema = z
  .object({
    entries: z.array(JournalEntryRegisterItemSchema)
  })
  .strict();
export type ListJournalEntriesOutput = z.infer<typeof ListJournalEntriesOutputSchema>;

export const AccountingReportDateRangeInputSchema = OrgSlugInputSchema.extend({
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional()
})
  .strict()
  .refine((input) => !input.fromDate || !input.toDate || input.fromDate <= input.toDate, {
    path: ["toDate"]
  });
export type AccountingReportDateRangeInput = z.infer<typeof AccountingReportDateRangeInputSchema>;

export const TrialBalanceInputSchema = OrgSlugInputSchema.extend({
  asOfDate: z.iso.date()
}).strict();
export type TrialBalanceInput = z.infer<typeof TrialBalanceInputSchema>;

export const TrialBalanceAccountSchema = z
  .object({
    accountCategory: LedgerAccountCategorySchema,
    accountCode: z.string().trim().min(1),
    accountId: z.uuid(),
    accountName: z.string().trim().min(1),
    balanceMinor: MinorUnitStringSchema,
    creditMinor: MinorUnitStringSchema,
    debitMinor: MinorUnitStringSchema,
    normalBalance: NormalBalanceSchema
  })
  .strict();
export type TrialBalanceAccount = z.infer<typeof TrialBalanceAccountSchema>;

export const TrialBalanceOutputSchema = z
  .object({
    accounts: z.array(TrialBalanceAccountSchema),
    isBalanced: z.boolean(),
    totalCreditMinor: MinorUnitStringSchema,
    totalDebitMinor: MinorUnitStringSchema
  })
  .strict();
export type TrialBalanceOutput = z.infer<typeof TrialBalanceOutputSchema>;

export const GeneralLedgerInputSchema = AccountingReportDateRangeInputSchema.extend({
  accountId: z.uuid(),
  ...CursorPaginationInputSchema.shape,
  // The ledger is a report: keep a larger page than the generic list default (30) so a
  // period's running/closing balance is visible without excessive "load more" fetches.
  limit: z.number().int().min(1).max(200).default(100)
}).strict();
export type GeneralLedgerInput = z.infer<typeof GeneralLedgerInputSchema>;

export const GeneralLedgerLineSchema = z
  .object({
    accountCode: z.string().trim().min(1),
    accountId: z.uuid(),
    accountName: z.string().trim().min(1),
    creditMinor: MinorUnitStringSchema,
    debitMinor: MinorUnitStringSchema,
    description: z.string().nullable(),
    entryNumber: z.string().trim().min(1),
    journalEntryId: z.uuid(),
    lineNumber: z.number().int().min(1),
    normalBalance: NormalBalanceSchema,
    postingDate: z.iso.date(),
    runningBalanceMinor: MinorUnitStringSchema
  })
  .strict();
export type GeneralLedgerLine = z.infer<typeof GeneralLedgerLineSchema>;

export const GeneralLedgerOutputSchema = z
  .object({
    closingBalanceMinor: MinorUnitStringSchema,
    lines: z.array(GeneralLedgerLineSchema),
    nextCursor: CursorPaginationOutputSchema.shape.nextCursor,
    openingBalanceMinor: MinorUnitStringSchema
  })
  .strict();
export type GeneralLedgerOutput = z.infer<typeof GeneralLedgerOutputSchema>;

function isPostgresBigintString(value: string): boolean {
  const isNegative = value.startsWith("-");
  const digits = isNegative ? value.slice(1) : value;
  const normalized = digits.replace(/^0+(?=\d)/, "");

  if (normalized.length < POSTGRES_BIGINT_MAX.length) {
    return true;
  }

  if (normalized.length > POSTGRES_BIGINT_MAX.length) {
    return false;
  }

  return normalized <= (isNegative ? POSTGRES_BIGINT_MIN : POSTGRES_BIGINT_MAX);
}
