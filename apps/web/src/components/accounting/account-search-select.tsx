import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";
import { Input } from "@tsu-stack/ui/components/input";
import { cn } from "@tsu-stack/ui/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selected = accounts.find((account) => account.id === value);
  const selectedLabel = selected ? `${selected.code} ${selected.name}` : "";
  const visibleAccounts = (
    normalizedQuery
      ? accounts.filter(
          (account) =>
            account.code.toLocaleLowerCase().includes(normalizedQuery) ||
            account.name.toLocaleLowerCase().includes(normalizedQuery)
        )
      : accounts
  ).slice(0, 8);

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
      <Input
        aria-expanded={open}
        aria-label={ariaLabel}
        className="pl-8"
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="Search account"
        value={open ? query : selectedLabel}
      />

      {open ? (
        <div className="absolute top-9 left-0 z-50 max-h-72 w-[320px] overflow-y-auto border bg-popover p-1 text-popover-foreground shadow-lg">
          {visibleAccounts.length > 0 ? (
            visibleAccounts.map((account) => (
              <button
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                  account.id === value && "bg-accent"
                )}
                key={account.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onValueChange(account.id);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 truncate">{account.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {account.code}
                </span>
              </button>
            ))
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No accounts found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
