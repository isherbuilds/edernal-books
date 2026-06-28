import { z } from "zod";

export function getDateInputValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * An optional text field: an empty string is allowed (the value is simply unset), otherwise the
 * trimmed value must satisfy `schema`. Keeps the "blank or matches the core contract" rule in one
 * place so every optional field validates consistently against its shared schema.
 */
export function optionalCoreField(schema: z.ZodType<string>, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || schema.safeParse(value).success, { message });
}
