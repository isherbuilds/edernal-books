import { describe, expect, it } from "vite-plus/test";

import { withGeneralLedgerRunningBalance } from "#@/accounting/reports/general-ledger";

describe("general ledger report", () => {
  it("computes running balance from an opening balance", () => {
    const report = withGeneralLedgerRunningBalance([
      {
        accountCode: "1000",
        accountId: "cash",
        accountName: "Cash",
        creditMinor: 0n,
        debitMinor: 10_000n,
        description: null,
        entryNumber: "JV-25-26-000001",
        journalEntryId: "entry-1",
        lineNumber: 1,
        normalBalance: "debit",
        openingBalanceMinor: 5_000n,
        postingDate: "2025-04-10"
      },
      {
        accountCode: "1000",
        accountId: "cash",
        accountName: "Cash",
        creditMinor: 2_500n,
        debitMinor: 0n,
        description: null,
        entryNumber: "JV-25-26-000002",
        journalEntryId: "entry-2",
        lineNumber: 1,
        normalBalance: "debit",
        openingBalanceMinor: 5_000n,
        postingDate: "2025-04-20"
      }
    ]);

    expect(report.map((line) => line.runningBalanceMinor)).toEqual([15_000n, 12_500n]);
  });
});
