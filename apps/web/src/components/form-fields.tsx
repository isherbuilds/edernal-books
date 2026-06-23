import { type ComponentProps, type ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

type FormFieldError = { message?: string } | undefined;

type FormTextFieldProps = ComponentProps<typeof Input> & {
  description?: ReactNode;
  error?: FormFieldError;
  label: ReactNode;
  name: string;
};

type FormSelectOption = {
  label: ReactNode;
  value: string;
};

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

function FormTextField({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  id: idProp,
  label,
  name,
  ...inputProps
}: FormTextFieldProps) {
  const id = idProp ?? name;
  const hasError = Boolean(error?.message);
  const hasParentInvalid = ariaInvalid === true || ariaInvalid === "true";
  const invalid = hasError || hasParentInvalid ? true : undefined;
  const errorId = hasError ? `${id}-error` : undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        aria-describedby={joinIds(ariaDescribedBy, errorId)}
        aria-invalid={invalid}
        className={className}
        id={id}
        name={name}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={error ? [error] : undefined} id={errorId} />
    </Field>
  );
}

function FormSelectField({
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

function joinIds(...ids: Array<string | undefined>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}

export { FormTextField, FormSelectField, type FormFieldError, type FormSelectOption };
