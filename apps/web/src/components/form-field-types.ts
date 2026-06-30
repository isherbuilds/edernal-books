import { type ReactNode } from "react";

export type FormFieldError = { message?: string } | undefined;

export type FormSelectOption = {
  label: ReactNode;
  value: string;
};
