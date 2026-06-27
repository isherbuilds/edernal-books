import { type LedgerAccountCategory, type NormalBalance } from "#@/accounting/types";

export type TrialBalanceLineInput = {
  accountCategory: LedgerAccountCategory;
  accountCode: string;
  accountId: string;
  accountName: string;
  creditMinor: bigint;
  debitMinor: bigint;
  normalBalance: NormalBalance;
};

export type TrialBalanceReportAccount = {
  accountCategory: LedgerAccountCategory;
  accountCode: string;
  accountId: string;
  accountName: string;
  balanceMinor: bigint;
  creditMinor: bigint;
  debitMinor: bigint;
  normalBalance: NormalBalance;
};

export type TrialBalance = {
  accounts: TrialBalanceReportAccount[];
  isBalanced: boolean;
  totalCreditMinor: bigint;
  totalDebitMinor: bigint;
};

export function buildTrialBalance(lines: TrialBalanceLineInput[]): TrialBalance {
  const accountRows = lines.map((account) => {
    return {
      ...account,
      balanceMinor: toNormalBalanceMinor(
        account.debitMinor,
        account.creditMinor,
        account.normalBalance
      )
    };
  });

  const totalDebitMinor = accountRows.reduce((sum, account) => sum + account.debitMinor, 0n);
  const totalCreditMinor = accountRows.reduce((sum, account) => sum + account.creditMinor, 0n);

  return {
    accounts: accountRows,
    isBalanced: totalDebitMinor === totalCreditMinor,
    totalCreditMinor,
    totalDebitMinor
  };
}

export function toNormalBalanceMinor(
  debitMinor: bigint,
  creditMinor: bigint,
  normalBalance: NormalBalance
): bigint {
  return normalBalance === "debit" ? debitMinor - creditMinor : creditMinor - debitMinor;
}
