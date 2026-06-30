import { type ReactNode } from "react";

import { Combobox, type ComboboxItem } from "@tsu-stack/ui/components/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { type FormFieldError } from "@/components/form-field-types";

type FormComboboxFieldProps<T extends ComboboxItem> = {
  description?: ReactNode;
  disabled?: boolean;
  emptyText?: ReactNode;
  error?: FormFieldError;
  id?: string;
  inputValue?: string;
  items: readonly T[];
  label: ReactNode;
  loading?: boolean;
  manualFiltering?: boolean;
  name: string;
  onInputValueChange?: (inputValue: string) => void;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  renderItem?: (item: T) => ReactNode;
  selectedItem?: T | null;
  itemToLabel?: (item: T) => string;
  value: string | null;
};

export function FormComboboxField<T extends ComboboxItem>({
  description,
  disabled,
  emptyText,
  error,
  id: idProp,
  inputValue,
  items,
  label,
  loading,
  manualFiltering,
  name,
  onInputValueChange,
  onValueChange,
  placeholder,
  renderItem,
  selectedItem,
  itemToLabel,
  value
}: FormComboboxFieldProps<T>) {
  const id = idProp ?? name;
  const hasError = Boolean(error?.message);
  const errorId = hasError ? `${id}-error` : undefined;

  return (
    <Field data-invalid={hasError ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        aria-describedby={errorId}
        aria-invalid={hasError ? true : undefined}
        disabled={disabled}
        emptyText={emptyText}
        id={id}
        inputValue={inputValue}
        items={items}
        itemToLabel={itemToLabel}
        loading={loading}
        manualFiltering={manualFiltering}
        name={name}
        onInputValueChange={onInputValueChange}
        onValueChange={onValueChange}
        placeholder={placeholder}
        renderItem={renderItem}
        selectedItem={selectedItem}
        value={value}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={error ? [error] : undefined} id={errorId} />
    </Field>
  );
}
