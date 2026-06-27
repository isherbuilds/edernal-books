import { SearchIcon } from "lucide-react";
import { useId, useState } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";
import { Input } from "@tsu-stack/ui/components/input";

type AccountSearchSelectProps = {
  accounts: LedgerAccountListItem[];
  "aria-label": string;
  onValueChange: (accountId: string) => void;
  value: string;
};

export function AccountSearchSelect({
  accounts,
  "aria-label": ariaLabel,
  onValueChange,
  value
}: AccountSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const datalistId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selected = accounts.find((account) => account.id === value);
  const selectedLabel = selected ? getAccountOptionLabel(selected) : "";
  const visibleAccounts = (
    normalizedQuery
      ? accounts.filter((account) =>
          getAccountOptionLabel(account).toLocaleLowerCase().includes(normalizedQuery)
        )
      : accounts
  ).slice(0, 8);

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
      <Input
        aria-label={ariaLabel}
        className="pl-8"
        list={datalistId}
        onBlur={() => {
          setFocused(false);
          setQuery("");
        }}
        onChange={(event) => {
          const nextQuery = event.currentTarget.value;
          const nextAccount = accounts.find(
            (account) => getAccountOptionLabel(account) === nextQuery
          );

          setQuery(nextQuery);
          if (nextAccount) {
            onValueChange(nextAccount.id);
          }
        }}
        onFocus={() => {
          setFocused(true);
          setQuery("");
        }}
        placeholder="Search account"
        value={focused ? query : selectedLabel}
      />
      <datalist id={datalistId}>
        {visibleAccounts.map((account) => (
          <option key={account.id} value={getAccountOptionLabel(account)}>
            {getAccountOptionLabel(account)}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function getAccountOptionLabel(account: LedgerAccountListItem): string {
  return `${account.code} ${account.name}`;
}
