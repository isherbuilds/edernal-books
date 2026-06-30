import { z } from "zod";

import { NonNegativeMinorUnitStringSchema } from "#@/accounting/types";
import { OrgSlugInputSchema } from "#@/organizations/index";
import { CursorPaginationInputSchema, CursorPaginationOutputSchema } from "#@/pagination";
import { nullableTextInput, SearchQuerySchema } from "#@/text/index";

export const ITEM_KINDS = ["goods", "service"] as const;
export const ITEM_USAGES = ["sales", "purchases", "both"] as const;
export const ITEM_ERROR_CODES = ["ITEM_NOT_FOUND"] as const;

export const ItemKindSchema = z.enum(ITEM_KINDS);
export type ItemKind = z.infer<typeof ItemKindSchema>;

export const ItemUsageSchema = z.enum(ITEM_USAGES);
export type ItemUsage = z.infer<typeof ItemUsageSchema>;

export const ItemErrorCodeSchema = z.enum(ITEM_ERROR_CODES);
export type ItemErrorCode = z.infer<typeof ItemErrorCodeSchema>;

// HSN (goods) / SAC (services) classification code — 4 to 8 digits.
const HSN_CODE_REGEX = /^[0-9]{4,8}$/;
export const HsnCodeSchema = z.string().trim().regex(HSN_CODE_REGEX);

export const ItemSchema = z
  .object({
    createdAt: z.iso.datetime(),
    description: z.string().nullable(),
    expenseAccountId: z.uuid().nullable(),
    hsnCode: HsnCodeSchema.nullable(),
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
  hsnCode: nullableTextInput(HsnCodeSchema),
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
  description: itemInputShape.description.optional(),
  expenseAccountId: itemInputShape.expenseAccountId.optional(),
  hsnCode: itemInputShape.hsnCode.optional(),
  kind: itemInputShape.kind.optional(),
  name: itemInputShape.name.optional(),
  purchaseRateMinor: itemInputShape.purchaseRateMinor.optional(),
  salesAccountId: itemInputShape.salesAccountId.optional(),
  salesRateMinor: itemInputShape.salesRateMinor.optional(),
  unit: itemInputShape.unit.optional(),
  usage: itemInputShape.usage.optional(),
  isActive: z.boolean().optional()
}).strict();
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

export const SetItemActiveInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  isActive: z.boolean()
}).strict();
export type SetItemActiveInput = z.infer<typeof SetItemActiveInputSchema>;

export const GetItemInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid()
}).strict();
export type GetItemInput = z.infer<typeof GetItemInputSchema>;

export const ListItemsInputSchema = OrgSlugInputSchema.extend({
  ...CursorPaginationInputSchema.shape,
  includeInactive: z.boolean().default(false).optional(),
  kind: ItemKindSchema.optional(),
  q: SearchQuerySchema.optional(),
  usage: ItemUsageSchema.optional()
}).strict();
export type ListItemsInput = z.infer<typeof ListItemsInputSchema>;

export const ListItemsOutputSchema = z
  .object({
    items: z.array(ItemSchema),
    nextCursor: CursorPaginationOutputSchema.shape.nextCursor
  })
  .strict();
export type ListItemsOutput = z.infer<typeof ListItemsOutputSchema>;
