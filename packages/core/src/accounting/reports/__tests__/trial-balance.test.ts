import { describe, expect, it } from "vite-plus/test";

import { buildTrialBalance } from "#@/accounting/reports/trial-balance";

describe("trial balance report", () => {
  it("keeps SQL-aggregated account totals balanced", () => {
    const report = buildTrialBalance([
      {
        accountCategory: "asset",
        accountCode: "1000",
        accountId: "cash",
        accountName: "Cash",
        creditMinor: 0n,
        debitMinor: 10_000n,
        normalBalance: "debit"
      },
      {
        accountCategory: "equity",
        accountCode: "3000",
        accountId: "capital",
        accountName: "Owner Capital",
        creditMinor: 10_000n,
        debitMinor: 0n,
        normalBalance: "credit"
      }
    ]);

    expect(report).toMatchObject({
      isBalanced: true,
      totalCreditMinor: 10_000n,
      totalDebitMinor: 10_000n
    });
    expect(report.accounts).toHaveLength(2);
    expect(report.accounts[0]).toMatchObject({
      accountId: "cash",
      balanceMinor: 10_000n
    });
  });
});
