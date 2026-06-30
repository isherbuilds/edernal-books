import { type ComponentProps, type ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { type FormFieldError } from "@/components/form-field-types";

type FormTextFieldProps = ComponentProps<typeof Input> & {
  description?: ReactNode;
  error?: FormFieldError;
  label: ReactNode;
  name: string;
};

export function FormTextField({
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

function joinIds(...ids: Array<string | undefined>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}
