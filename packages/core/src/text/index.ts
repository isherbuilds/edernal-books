import { z } from "zod";

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Shared upper bound for free-text search queries (list filters + the UI input). */
export const SEARCH_QUERY_MAX_LENGTH = 120;
export const SearchQuerySchema = z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH);

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
