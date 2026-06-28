import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_LEDGER_ACCOUNTS } from "#@/accounting/accounts";
import {
  ACCOUNTING_ERROR_CODES,
  ACCOUNTING_PERIOD_STATUSES,
  GeneralLedgerInputSchema,
  LedgerAccountSchema,
  MinorUnitStringSchema,
  PostJournalEntryLineInputSchema,
  PostJournalEntryInputSchema,
  ReverseJournalEntryInputSchema,
  SetupFiscalYearInputSchema
} from "#@/accounting/types";
import { DEFAULT_CURSOR_LIMIT } from "#@/pagination";

describe("accounting contracts", () => {
  it("uses reviewed Phase 1 accounting period statuses", () => {
    expect(ACCOUNTING_PERIOD_STATUSES).toEqual(["open", "locked", "closed"]);
  });

  it("does not expose stale accounting error codes", () => {
    expect(ACCOUNTING_ERROR_CODES).not.toContain("JOURNAL_BASE_CURRENCY_MISMATCH");
    expect(ACCOUNTING_ERROR_CODES).not.toContain("JOURNAL_ENTRY_LINE_AMOUNT_SIDE_MISMATCH");
    expect(ACCOUNTING_ERROR_CODES).not.toContain("POSTING_DATE_OUTSIDE_PERIOD");
  });

  it("exposes reversal integrity errors", () => {
    expect(ACCOUNTING_ERROR_CODES).toContain("JOURNAL_ENTRY_ALREADY_REVERSED");
    expect(ACCOUNTING_ERROR_CODES).toContain("JOURNAL_OPERATION_KEY_PAYLOAD_MISMATCH");
    expect(ACCOUNTING_ERROR_CODES).toContain("GENERAL_LEDGER_CURSOR_INVALID");
  });

  it("keeps ledger account hierarchy and manual posting in the public contract", () => {
    expect(
      LedgerAccountSchema.parse({
        accountCategory: "asset",
        accountType: "cash",
        allowManualPosting: true,
        code: "1000",
        id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        name: "Cash",
        normalBalance: "debit",
        parentAccountId: "018ff8d9-ae36-7d5b-8f21-8687bde90002",
        systemKey: "cash"
      })
    ).toMatchObject({
      allowManualPosting: true,
      parentAccountId: "018ff8d9-ae36-7d5b-8f21-8687bde90002"
    });
  });

  it("seeds group and posting accounts for Phase 1", () => {
    expect(DEFAULT_LEDGER_ACCOUNTS.some((account) => account.systemKey === "assets")).toBe(true);
    expect(
      DEFAULT_LEDGER_ACCOUNTS.find((account) => account.systemKey === "accounts_receivable")
    ).toMatchObject({ allowManualPosting: false });
    expect(
      DEFAULT_LEDGER_ACCOUNTS.find((account) => account.systemKey === "accounts_payable")
    ).toMatchObject({ allowManualPosting: false });
    expect(
      DEFAULT_LEDGER_ACCOUNTS.find((account) => account.systemKey === "opening_balance_difference")
    ).toBeDefined();
    expect(DEFAULT_LEDGER_ACCOUNTS.some((account) => account.systemKey.includes("gst"))).toBe(
      false
    );
  });

  it("accepts minor-unit strings at transport boundaries", () => {
    expect(MinorUnitStringSchema.parse("123456")).toBe("123456");
    expect(MinorUnitStringSchema.parse("-123456")).toBe("-123456");
    expect(MinorUnitStringSchema.parse("9223372036854775807")).toBe("9223372036854775807");
    expect(MinorUnitStringSchema.parse("-9223372036854775808")).toBe("-9223372036854775808");
  });

  it("rejects raw bigint minor units in oRPC inputs", () => {
    const result = PostJournalEntryInputSchema.safeParse({
      lines: [
        {
          accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
          amountMinor: 10000n,
          side: "debit"
        },
        {
          accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90002",
          amountMinor: "10000",
          side: "credit"
        }
      ],
      operationKey: "op_12345678",
      orgSlug: "demo",
      postingDate: "2026-04-01"
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid money transport values", () => {
    expect(MinorUnitStringSchema.safeParse("9223372036854775808").success).toBe(false);
    expect(MinorUnitStringSchema.safeParse("-9223372036854775809").success).toBe(false);
    expect(
      PostJournalEntryLineInputSchema.safeParse({
        accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        amountMinor: "0",
        side: "debit"
      }).success
    ).toBe(false);

    const result = PostJournalEntryInputSchema.safeParse({
      lines: [
        {
          accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
          amountMinor: "-1",
          side: "debit"
        },
        {
          accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90002",
          amountMinor: "10000",
          side: "credit"
        }
      ],
      operationKey: "op_12345678",
      orgSlug: "demo",
      postingDate: "2026-04-01"
    });

    expect(result.success).toBe(false);
  });

  it("requires a reversal reason", () => {
    const baseInput = {
      journalEntryId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      operationKey: "reverse_12345678",
      orgSlug: "demo",
      postingDate: "2026-04-01"
    };

    expect(ReverseJournalEntryInputSchema.safeParse(baseInput).success).toBe(false);
    expect(
      ReverseJournalEntryInputSchema.safeParse({
        ...baseInput,
        description: " "
      }).success
    ).toBe(false);
    expect(
      ReverseJournalEntryInputSchema.safeParse({
        ...baseInput,
        description: "Customer invoice voided"
      }).success
    ).toBe(true);
  });

  it("accepts fiscal-year dates without exposing a user-entered name", () => {
    expect(
      SetupFiscalYearInputSchema.parse({
        endDate: "2027-03-31",
        orgSlug: "demo",
        startDate: "2026-04-01"
      })
    ).toEqual({
      endDate: "2027-03-31",
      orgSlug: "demo",
      startDate: "2026-04-01"
    });

    expect(
      SetupFiscalYearInputSchema.safeParse({
        endDate: "2027-03-31",
        name: "FY 2026-27",
        orgSlug: "demo",
        startDate: "2026-04-01"
      }).success
    ).toBe(false);
  });

  it("requires account-scoped general ledger reads", () => {
    expect(
      GeneralLedgerInputSchema.safeParse({
        orgSlug: "demo",
        toDate: "2026-04-30"
      }).success
    ).toBe(false);
  });

  it("uses shared cursor pagination defaults for general ledger reads", () => {
    expect(
      GeneralLedgerInputSchema.parse({
        accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        orgSlug: "demo"
      })
    ).toMatchObject({
      limit: DEFAULT_CURSOR_LIMIT
    });
  });

  it("rejects report date ranges with fromDate after toDate", () => {
    expect(
      GeneralLedgerInputSchema.safeParse({
        accountId: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        fromDate: "2026-04-30",
        orgSlug: "demo",
        toDate: "2026-04-01"
      }).success
    ).toBe(false);
  });
});
