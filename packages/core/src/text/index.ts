import { z } from "zod";

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const EmptyTextAsNullSchema = z
  .string()
  .trim()
  .length(0)
  .transform(() => null);

export function nullableTextInput(schema: z.ZodType<string>) {
  return z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.union([EmptyTextAsNullSchema, schema, z.null()])
    )
    .optional();
}
