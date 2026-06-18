import { z } from "zod";

export const DEFAULT_ORGANIZATION_SETTINGS = {
  baseCurrencyCode: "INR",
  countryCode: "IN",
  fiscalYearStartMonth: 4,
  timezone: "Asia/Kolkata"
} as const;

const orgSlugReferenceShape = {
  orgSlug: z.string().trim().min(1).max(160)
};

export const OrgSlugInputSchema = z.object(orgSlugReferenceShape).strict();
export type OrgSlugInput = z.infer<typeof OrgSlugInputSchema>;

export const CountryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}$/);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

export const CurrencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const FiscalYearStartMonthSchema = z.number().int().min(1).max(12);
export type FiscalYearStartMonth = z.infer<typeof FiscalYearStartMonthSchema>;

export const OrganizationSettingSchema = z.object({
  baseCurrencyCode: CurrencyCodeSchema,
  booksStartDate: z.iso.date(),
  countryCode: CountryCodeSchema,
  createdAt: z.iso.datetime(),
  fiscalYearStartMonth: FiscalYearStartMonthSchema,
  legalName: z.string().trim().min(1).max(240),
  organizationId: z.string().min(1),
  primaryEmail: z.email().max(320).nullable(),
  primaryPhone: z.string().trim().max(64).nullable(),
  timezone: z.string().trim().min(1).max(80),
  tradeName: z.string().trim().max(240).nullable(),
  updatedAt: z.iso.datetime()
});
export type OrganizationSetting = z.infer<typeof OrganizationSettingSchema>;

const organizationSettingInputShape = {
  baseCurrencyCode: CurrencyCodeSchema.default(DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode),
  booksStartDate: z.iso.date(),
  countryCode: CountryCodeSchema.default(DEFAULT_ORGANIZATION_SETTINGS.countryCode),
  fiscalYearStartMonth: FiscalYearStartMonthSchema.default(
    DEFAULT_ORGANIZATION_SETTINGS.fiscalYearStartMonth
  ),
  legalName: z.string().trim().min(1).max(240),
  primaryEmail: z.email().max(320).nullable().optional(),
  primaryPhone: z.string().trim().max(64).nullable().optional(),
  timezone: z.string().trim().min(1).max(80).default(DEFAULT_ORGANIZATION_SETTINGS.timezone),
  tradeName: z.string().trim().max(240).nullable().optional()
};

export const GetOrganizationSettingInputSchema = OrgSlugInputSchema;
export type GetOrganizationSettingInput = OrgSlugInput;

export const UpsertOrganizationSettingInputSchema = z
  .object({
    ...organizationSettingInputShape,
    ...orgSlugReferenceShape
  })
  .strict();
export type UpsertOrganizationSettingInput = z.infer<typeof UpsertOrganizationSettingInputSchema>;

export const UpsertOrganizationSettingOutputSchema = z
  .object({
    ok: z.literal(true),
    organizationId: z.string().min(1)
  })
  .strict();
