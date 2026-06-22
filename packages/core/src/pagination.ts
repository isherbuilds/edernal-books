import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_CURSOR_LIMIT = 30;
export const MAX_PAGE_SIZE = 100;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const CursorTokenSchema = z.string().min(1).max(512);
export type CursorToken = z.infer<typeof CursorTokenSchema>;

export const CursorPaginationInputSchema = z
  .object({
    cursor: CursorTokenSchema.optional(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_CURSOR_LIMIT)
  })
  .strict();
export type CursorPaginationInput = z.infer<typeof CursorPaginationInputSchema>;

export const CursorPaginationOutputSchema = z
  .object({
    nextCursor: CursorTokenSchema.nullable()
  })
  .strict();
export type CursorPaginationOutput = z.infer<typeof CursorPaginationOutputSchema>;

export const PaginationInputSchema = z
  .object({
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    page: z.number().int().min(1).default(1)
  })
  .strict();
export type PaginationInput = z.infer<typeof PaginationInputSchema>;

export const PaginationOutputSchema = z
  .object({
    hasMore: z.boolean(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE),
    page: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(1)
  })
  .strict();
export type PaginationOutput = z.infer<typeof PaginationOutputSchema>;

export function clampCursorLimit(input: Partial<Pick<CursorPaginationInput, "limit">>) {
  const requestedLimit = input.limit ?? DEFAULT_CURSOR_LIMIT;
  return Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);
}

export function clampPage(input: Partial<PaginationInput>) {
  const page = Math.max(input.page ?? 1, 1);
  const requestedLimit = input.limit ?? DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);

  return {
    limit,
    offset: (page - 1) * limit,
    page
  };
}

export function createPaginationOutput(input: {
  limit: number;
  page: number;
  totalItems: number;
}): PaginationOutput {
  const totalPages = Math.max(Math.ceil(input.totalItems / input.limit), 1);

  return {
    hasMore: input.page < totalPages,
    limit: input.limit,
    page: input.page,
    totalItems: input.totalItems,
    totalPages
  };
}
