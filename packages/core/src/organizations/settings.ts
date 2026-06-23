import { z } from "zod";

export const DEFAULT_ORGANIZATION_SETTINGS = {
  baseCurrencyCode: "INR",
  countryCode: "IN",
  fiscalYearStartMonth: 4,
  timezone: "Asia/Kolkata"
} as const;

export const SUPPORTED_ORGANIZATION_CURRENCY_CODES = ["INR", "USD", "EUR", "GBP"] as const;
export const SUPPORTED_ORGANIZATION_COUNTRY_CODES = ["IN", "US", "GB"] as const;
export const SUPPORTED_ORGANIZATION_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "Europe/London"
] as const;
export const ORGANIZATION_FISCAL_YEAR_START_MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
] as const;

const orgSlugReferenceShape = {
  orgSlug: z.string().trim().min(1).max(160)
};
const EmptyTextAsNullSchema = z
  .string()
  .trim()
  .length(0)
  .transform(() => null);

function nullableTextInput(schema: z.ZodType<string>) {
  return z.union([EmptyTextAsNullSchema, schema, z.null()]).optional();
}

export const OrgSlugInputSchema = z.object(orgSlugReferenceShape).strict();
export type OrgSlugInput = z.infer<typeof OrgSlugInputSchema>;

export const CountryCodeSchema = z.enum(SUPPORTED_ORGANIZATION_COUNTRY_CODES);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

export const CurrencyCodeSchema = z.enum(SUPPORTED_ORGANIZATION_CURRENCY_CODES);
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
  primaryEmail: nullableTextInput(z.string().trim().pipe(z.email().max(320))),
  primaryPhone: nullableTextInput(z.string().trim().max(64)),
  timezone: z.string().trim().min(1).max(80).default(DEFAULT_ORGANIZATION_SETTINGS.timezone),
  tradeName: nullableTextInput(z.string().trim().max(240))
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
