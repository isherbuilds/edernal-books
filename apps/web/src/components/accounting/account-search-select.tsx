import { type ReactNode, useMemo, useState } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { FormComboboxField, type FormFieldError } from "@/components/form-fields";

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

type AccountSearchSelectProps = {
  description?: ReactNode;
  disabled?: boolean;
  emptyText?: ReactNode;
  error?: FormFieldError;
  id?: string;
  label: ReactNode;
  name?: string;
  onValueChange: (accountId: string | null) => void;
  orgSlug: string;
  placeholder?: string;
  value: string | null;
};

export function AccountSearchSelect({
  description,
  disabled,
  emptyText,
  error,
  id,
  label,
  name,
  onValueChange,
  orgSlug,
  placeholder,
  value
}: AccountSearchSelectProps) {
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [pickedOption, setPickedOption] = useState<AccountComboboxOption | null>(null);
  const debouncedQuery = useDebouncedValue((inputValue ?? "").trim());
  const accountsQuery = useChartAccountsQuery(orgSlug, {
    q: debouncedQuery.length > 0 ? debouncedQuery : undefined
  });

  const accounts = accountsQuery.data?.accounts;

  const postableOptions = useMemo(
    () =>
      (accounts ?? [])
        .filter((account) => account.active && !account.isGroup && account.allowManualPosting)
        .map(toAccountComboboxOption),
    [accounts]
  );

  // Resolve the saved selection from the full chart, not just the postable subset, so an account
  // that later became inactive/group/non-postable still renders instead of showing a blank field.
  const selectedOption = useMemo(() => {
    if (pickedOption && pickedOption.value === value) {
      return pickedOption;
    }

    const saved = value ? accounts?.find((account) => account.id === value) : undefined;
    return saved ? toAccountComboboxOption(saved) : null;
  }, [accounts, pickedOption, value]);

  const options = useMemo(
    () =>
      selectedOption && !postableOptions.some((option) => option.value === selectedOption.value)
        ? [selectedOption, ...postableOptions]
        : postableOptions,
    [postableOptions, selectedOption]
  );

  return (
    <FormComboboxField<AccountComboboxOption>
      description={description}
      disabled={disabled}
      emptyText={emptyText}
      error={error}
      id={id}
      inputValue={inputValue ?? selectedOption?.label ?? ""}
      items={options}
      label={label}
      loading={accountsQuery.isLoading}
      manualFiltering
      name={name ?? "account"}
      onInputValueChange={setInputValue}
      onValueChange={(nextValue) => {
        const nextOption = nextValue
          ? (options.find((option) => option.value === nextValue) ?? null)
          : null;

        setPickedOption(nextOption);
        setInputValue(nextOption ? null : "");
        onValueChange(nextValue);
      }}
      placeholder={placeholder}
      renderItem={renderAccountComboboxOption}
      selectedItem={selectedOption}
      value={value}
    />
  );
}
