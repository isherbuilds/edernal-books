import { z } from "zod";

import { OrgSlugInputSchema } from "#@/organizations/index";

export const ITEM_KINDS = ["goods", "service"] as const;
export const ITEM_USAGES = ["sales", "purchases", "both"] as const;

const EmptyTextAsNullSchema = z
  .string()
  .trim()
  .length(0)
  .transform(() => null);

const POSTGRES_BIGINT_MAX = "9223372036854775807";

function nullableTextInput(schema: z.ZodType<string>) {
  return z.union([EmptyTextAsNullSchema, schema, z.null()]).optional();
}

function isPostgresNonNegativeBigintString(value: string): boolean {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  const normalized = value.replace(/^0+(?=\d)/, "");

  if (normalized.length !== POSTGRES_BIGINT_MAX.length) {
    return normalized.length < POSTGRES_BIGINT_MAX.length;
  }

  return normalized <= POSTGRES_BIGINT_MAX;
}

export function normalizeItemName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export const ItemKindSchema = z.enum(ITEM_KINDS);
export type ItemKind = z.infer<typeof ItemKindSchema>;

export const ItemUsageSchema = z.enum(ITEM_USAGES);
export type ItemUsage = z.infer<typeof ItemUsageSchema>;

export const NonNegativeMinorUnitStringSchema = z
  .string()
  .regex(/^\d+$/)
  .refine(isPostgresNonNegativeBigintString);
export type NonNegativeMinorUnitString = z.infer<typeof NonNegativeMinorUnitStringSchema>;

export const ItemSchema = z
  .object({
    createdAt: z.iso.datetime(),
    description: z.string().nullable(),
    expenseAccountId: z.uuid().nullable(),
    id: z.uuid(),
    isActive: z.boolean(),
    kind: ItemKindSchema,
    name: z.string().trim().min(1).max(240),
    normalizedName: z.string().trim().min(1).max(240),
    organizationId: z.string().min(1),
    purchaseRateMinor: NonNegativeMinorUnitStringSchema.nullable(),
    salesAccountId: z.uuid().nullable(),
    salesRateMinor: NonNegativeMinorUnitStringSchema.nullable(),
    unit: z.string().nullable(),
    updatedAt: z.iso.datetime(),
    usage: ItemUsageSchema
  })
  .strict();
export type Item = z.infer<typeof ItemSchema>;

const itemInputShape = {
  description: nullableTextInput(z.string().trim().max(1000)),
  expenseAccountId: z.uuid().nullable().optional(),
  kind: ItemKindSchema,
  name: z.string().trim().min(1).max(240),
  purchaseRateMinor: NonNegativeMinorUnitStringSchema.nullable().optional(),
  salesAccountId: z.uuid().nullable().optional(),
  salesRateMinor: NonNegativeMinorUnitStringSchema.nullable().optional(),
  unit: nullableTextInput(z.string().trim().max(40)),
  usage: ItemUsageSchema
};

export const CreateItemInputSchema = OrgSlugInputSchema.extend(itemInputShape).strict();
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

export const UpdateItemInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  ...Object.fromEntries(
    Object.entries(itemInputShape).map(([key, schema]) => [key, schema.optional()])
  ),
  isActive: z.boolean().optional()
}).strict();
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

export const SetItemActiveInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  isActive: z.boolean()
}).strict();
export type SetItemActiveInput = z.infer<typeof SetItemActiveInputSchema>;

export const ListItemsInputSchema = OrgSlugInputSchema.extend({
  includeInactive: z.boolean().default(false).optional(),
  kind: ItemKindSchema.optional(),
  q: z.string().trim().min(1).max(120).optional(),
  usage: ItemUsageSchema.optional()
}).strict();
export type ListItemsInput = z.infer<typeof ListItemsInputSchema>;

export const ListItemsOutputSchema = z
  .object({
    items: z.array(ItemSchema)
  })
  .strict();
export type ListItemsOutput = z.infer<typeof ListItemsOutputSchema>;
