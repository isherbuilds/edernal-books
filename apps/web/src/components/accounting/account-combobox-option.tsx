import { type ReactNode } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";

export type AccountComboboxOption = {
  code: string;
  label: string;
  name: string;
  value: string;
};

export function toAccountComboboxOption(account: LedgerAccountListItem): AccountComboboxOption {
  return {
    code: account.code,
    label: `${account.code} ${account.name}`,
    name: account.name,
    value: account.id
  };
}

export function renderAccountComboboxOption(option: AccountComboboxOption): ReactNode {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{option.code}</span>
      <span className="truncate">{option.name}</span>
    </span>
  );
}
