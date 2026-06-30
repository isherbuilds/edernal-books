import { type ReactNode, useState } from "react";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import {
  type AccountComboboxOption,
  renderAccountComboboxOption,
  toAccountComboboxOption
} from "@/components/accounting/account-combobox-option";
import { FormComboboxField, type FormFieldError } from "@/components/form-fields";

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

  const postableOptions = (accounts ?? []).reduce<AccountComboboxOption[]>((options, account) => {
    if (account.active && !account.isGroup && account.allowManualPosting) {
      options.push(toAccountComboboxOption(account));
    }

    return options;
  }, []);

  // Resolve the saved selection from the full chart, not just the postable subset, so an account
  // that later became inactive/group/non-postable still renders instead of showing a blank field.
  let selectedOption: AccountComboboxOption | null = null;
  if (pickedOption && pickedOption.value === value) {
    selectedOption = pickedOption;
  } else {
    const saved = value ? accounts?.find((account) => account.id === value) : undefined;
    selectedOption = saved ? toAccountComboboxOption(saved) : null;
  }

  const options =
    selectedOption && !postableOptions.some((option) => option.value === selectedOption.value)
      ? [selectedOption, ...postableOptions]
      : postableOptions;

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
