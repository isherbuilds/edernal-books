import { z } from "zod";

import { OrgSlugInputSchema } from "#@/organizations/index";

export const PARTY_KINDS = ["customer", "vendor", "both"] as const;

const EmptyTextAsNullSchema = z
  .string()
  .trim()
  .length(0)
  .transform(() => null);

function nullableTextInput(schema: z.ZodType<string>) {
  return z.union([EmptyTextAsNullSchema, schema, z.null()]).optional();
}

export function normalizePartyName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export const PartyKindSchema = z.enum(PARTY_KINDS);
export type PartyKind = z.infer<typeof PartyKindSchema>;

export const PartySchema = z
  .object({
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    city: z.string().nullable(),
    countryCode: z.string().trim().min(2).max(2).nullable(),
    createdAt: z.iso.datetime(),
    displayName: z.string().trim().min(1).max(240),
    email: z.email().max(320).nullable(),
    id: z.uuid(),
    isActive: z.boolean(),
    kind: PartyKindSchema,
    legalName: z.string().nullable(),
    normalizedName: z.string().trim().min(1).max(240),
    organizationId: z.string().min(1),
    phone: z.string().nullable(),
    postalCode: z.string().nullable(),
    state: z.string().nullable(),
    updatedAt: z.iso.datetime()
  })
  .strict();
export type Party = z.infer<typeof PartySchema>;

const partyInputShape = {
  addressLine1: nullableTextInput(z.string().trim().max(240)),
  addressLine2: nullableTextInput(z.string().trim().max(240)),
  city: nullableTextInput(z.string().trim().max(120)),
  countryCode: nullableTextInput(z.string().trim().length(2).toUpperCase()),
  displayName: z.string().trim().min(1).max(240),
  email: nullableTextInput(z.email().trim().max(320)),
  kind: PartyKindSchema,
  legalName: nullableTextInput(z.string().trim().max(240)),
  phone: nullableTextInput(z.string().trim().max(64)),
  postalCode: nullableTextInput(z.string().trim().max(24)),
  state: nullableTextInput(z.string().trim().max(120))
};

export const CreatePartyInputSchema = OrgSlugInputSchema.extend(partyInputShape).strict();
export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;

export const UpdatePartyInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  ...Object.fromEntries(
    Object.entries(partyInputShape).map(([key, schema]) => [key, schema.optional()])
  ),
  isActive: z.boolean().optional()
}).strict();
export type UpdatePartyInput = z.infer<typeof UpdatePartyInputSchema>;

export const SetPartyActiveInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  isActive: z.boolean()
}).strict();
export type SetPartyActiveInput = z.infer<typeof SetPartyActiveInputSchema>;

export const ListPartiesInputSchema = OrgSlugInputSchema.extend({
  includeInactive: z.boolean().default(false).optional(),
  kind: PartyKindSchema.optional(),
  q: z.string().trim().min(1).max(120).optional()
}).strict();
export type ListPartiesInput = z.infer<typeof ListPartiesInputSchema>;

export const ListPartiesOutputSchema = z
  .object({
    parties: z.array(PartySchema)
  })
  .strict();
export type ListPartiesOutput = z.infer<typeof ListPartiesOutputSchema>;
