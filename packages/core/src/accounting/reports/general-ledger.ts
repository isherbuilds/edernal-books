import { type NormalBalance } from "#@/accounting/types";

import { toNormalBalanceMinor } from "./trial-balance";

export type GeneralLedgerLineInput = {
  accountCode: string;
  accountId: string;
  accountName: string;
  creditMinor: bigint;
  debitMinor: bigint;
  description: null | string;
  entryNumber: string;
  journalEntryId: string;
  lineNumber: number;
  normalBalance: NormalBalance;
  openingBalanceMinor: bigint;
  postingDate: string;
};

export type GeneralLedgerRunningLine = GeneralLedgerLineInput & {
  runningBalanceMinor: bigint;
};

export function withGeneralLedgerRunningBalance(
  lines: GeneralLedgerLineInput[]
): GeneralLedgerRunningLine[] {
  let runningBalanceMinor = lines[0]?.openingBalanceMinor ?? 0n;

  return lines.map((line) => {
    const movement = toNormalBalanceMinor(line.debitMinor, line.creditMinor, line.normalBalance);
    runningBalanceMinor += movement;

    return {
      ...line,
      runningBalanceMinor
    };
  });
}
