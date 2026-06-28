import { z } from "zod";

import { OrgSlugInputSchema } from "#@/organizations/index";
import { CursorPaginationInputSchema, CursorPaginationOutputSchema } from "#@/pagination";
import { nullableTextInput, SearchQuerySchema } from "#@/text/index";

export const PARTY_KINDS = ["customer", "vendor", "both"] as const;
export const PARTY_ERROR_CODES = [
  "PARTY_CURSOR_INVALID",
  "PARTY_DUPLICATE_NAME",
  "PARTY_NOT_FOUND"
] as const;

export const PartyKindSchema = z.enum(PARTY_KINDS);
export type PartyKind = z.infer<typeof PartyKindSchema>;

export const PartyErrorCodeSchema = z.enum(PARTY_ERROR_CODES);
export type PartyErrorCode = z.infer<typeof PartyErrorCodeSchema>;

export const GST_REGISTRATION_TYPES = [
  "registered_regular",
  "registered_composition",
  "unregistered",
  "consumer"
] as const;

export const GstRegistrationTypeSchema = z.enum(GST_REGISTRATION_TYPES);
export type GstRegistrationType = z.infer<typeof GstRegistrationTypeSchema>;

// GSTIN: 2-digit state code + 10-char PAN + entity code + 'Z' + checksum char.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// PAN: 5 letters + 4 digits + 1 letter.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// ISO 3166-1 alpha-2 country code — matches the party_country_code_ck DB constraint.
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export const GstinSchema = z.string().trim().toUpperCase().regex(GSTIN_REGEX);
export const PanSchema = z.string().trim().toUpperCase().regex(PAN_REGEX);
export const PartyCountryCodeSchema = z.string().trim().toUpperCase().regex(COUNTRY_CODE_REGEX);

export const PartySchema = z
  .object({
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    city: z.string().nullable(),
    countryCode: PartyCountryCodeSchema.nullable(),
    createdAt: z.iso.datetime(),
    displayName: z.string().trim().min(1).max(240),
    email: z.email().max(320).nullable(),
    gstRegistrationType: GstRegistrationTypeSchema,
    gstin: GstinSchema.nullable(),
    id: z.uuid(),
    isActive: z.boolean(),
    kind: PartyKindSchema,
    legalName: z.string().nullable(),
    normalizedName: z.string().trim().min(1).max(240),
    organizationId: z.string().min(1),
    pan: PanSchema.nullable(),
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
  countryCode: nullableTextInput(PartyCountryCodeSchema),
  displayName: z.string().trim().min(1).max(240),
  email: nullableTextInput(z.email().trim().max(320)),
  gstin: nullableTextInput(GstinSchema),
  kind: PartyKindSchema,
  legalName: nullableTextInput(z.string().trim().max(240)),
  pan: nullableTextInput(PanSchema),
  phone: nullableTextInput(z.string().trim().max(64)),
  postalCode: nullableTextInput(z.string().trim().max(24)),
  state: nullableTextInput(z.string().trim().max(120))
};

export const CreatePartyInputSchema = OrgSlugInputSchema.extend({
  ...partyInputShape,
  // Default only applies on create; updates must omit-or-set, never reset to default.
  gstRegistrationType: GstRegistrationTypeSchema.default("unregistered")
}).strict();
export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;

export const UpdatePartyInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  addressLine1: partyInputShape.addressLine1.optional(),
  addressLine2: partyInputShape.addressLine2.optional(),
  city: partyInputShape.city.optional(),
  countryCode: partyInputShape.countryCode.optional(),
  displayName: partyInputShape.displayName.optional(),
  email: partyInputShape.email.optional(),
  gstin: partyInputShape.gstin.optional(),
  kind: partyInputShape.kind.optional(),
  legalName: partyInputShape.legalName.optional(),
  pan: partyInputShape.pan.optional(),
  phone: partyInputShape.phone.optional(),
  postalCode: partyInputShape.postalCode.optional(),
  state: partyInputShape.state.optional(),
  gstRegistrationType: GstRegistrationTypeSchema.optional(),
  isActive: z.boolean().optional()
}).strict();
export type UpdatePartyInput = z.infer<typeof UpdatePartyInputSchema>;

export const SetPartyActiveInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid(),
  isActive: z.boolean()
}).strict();
export type SetPartyActiveInput = z.infer<typeof SetPartyActiveInputSchema>;

export const GetPartyInputSchema = OrgSlugInputSchema.extend({
  id: z.uuid()
}).strict();
export type GetPartyInput = z.infer<typeof GetPartyInputSchema>;

export const ListPartiesInputSchema = OrgSlugInputSchema.extend({
  ...CursorPaginationInputSchema.shape,
  includeInactive: z.boolean().default(false).optional(),
  kind: PartyKindSchema.optional(),
  q: SearchQuerySchema.optional()
}).strict();
export type ListPartiesInput = z.infer<typeof ListPartiesInputSchema>;

export const ListPartiesOutputSchema = z
  .object({
    nextCursor: CursorPaginationOutputSchema.shape.nextCursor,
    parties: z.array(PartySchema)
  })
  .strict();
export type ListPartiesOutput = z.infer<typeof ListPartiesOutputSchema>;
