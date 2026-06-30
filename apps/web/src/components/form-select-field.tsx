import { type ComponentProps, type ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { type FormFieldError, type FormSelectOption } from "@/components/form-field-types";

type FormSelectFieldProps = {
  description?: ReactNode;
  disabled?: boolean;
  error?: FormFieldError;
  id?: string;
  label: ReactNode;
  name: string;
  onBlur?: ComponentProps<typeof SelectTrigger>["onBlur"];
  onValueChange: (value: string | null) => void;
  options: Array<FormSelectOption>;
  value: string;
};

export function FormSelectField({
  description,
  disabled = false,
  error,
  id: idProp,
  label,
  name,
  onBlur,
  onValueChange,
  options,
  value
}: FormSelectFieldProps) {
  const id = idProp ?? name;
  const hasError = Boolean(error?.message);
  const errorId = hasError ? `${id}-error` : undefined;

  return (
    <Field data-invalid={hasError ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        items={options}
        name={name}
        onValueChange={onValueChange}
        value={value}
      >
        <SelectTrigger
          aria-describedby={errorId}
          aria-invalid={hasError ? true : undefined}
          id={id}
          onBlur={onBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={error ? [error] : undefined} id={errorId} />
    </Field>
  );
}
