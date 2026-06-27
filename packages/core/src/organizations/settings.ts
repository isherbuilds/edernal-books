import { z } from "zod";

export const DEFAULT_ORGANIZATION_SETTINGS = {
  baseCurrencyCode: "INR",
  countryCode: "IN",
  fiscalYearStartMonth: 4,
  timezone: "Asia/Kolkata"
} as const;

export const SUPPORTED_ORGANIZATION_CURRENCY_CODES = ["INR", "USD", "EUR", "GBP"] as const;

type SupportedOrganizationCurrencyCode = (typeof SUPPORTED_ORGANIZATION_CURRENCY_CODES)[number];

const SUPPORTED_CURRENCY_METADATA = {
  INR: {
    active: true,
    decimalPlaces: 2,
    name: "Indian Rupee",
    symbol: "₹"
  },
  USD: {
    active: true,
    decimalPlaces: 2,
    name: "US Dollar",
    symbol: "$"
  },
  EUR: {
    active: true,
    decimalPlaces: 2,
    name: "Euro",
    symbol: "€"
  },
  GBP: {
    active: true,
    decimalPlaces: 2,
    name: "Pound Sterling",
    symbol: "£"
  }
} satisfies Record<
  SupportedOrganizationCurrencyCode,
  {
    active: boolean;
    decimalPlaces: number;
    name: string;
    symbol: string;
  }
>;

export const SUPPORTED_CURRENCIES = SUPPORTED_ORGANIZATION_CURRENCY_CODES.map((code) => {
  return {
    code,
    ...SUPPORTED_CURRENCY_METADATA[code]
  };
});
export const SUPPORTED_ORGANIZATION_COUNTRY_CODES = ["IN", "US", "GB"] as const;
export const SUPPORTED_ORGANIZATION_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "Europe/London"
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

export const CurrencyMetadataSchema = z
  .object({
    active: z.boolean(),
    code: CurrencyCodeSchema,
    decimalPlaces: z.number().int().min(0).max(6),
    name: z.string().trim().min(1).max(120),
    symbol: z.string().trim().min(1).max(16)
  })
  .strict();
export type CurrencyMetadata = z.infer<typeof CurrencyMetadataSchema>;

export const TimezoneSchema = z.enum(SUPPORTED_ORGANIZATION_TIMEZONES);
export type Timezone = z.infer<typeof TimezoneSchema>;

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
  timezone: TimezoneSchema,
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
  primaryEmail: nullableTextInput(z.email().trim().max(320)),
  primaryPhone: nullableTextInput(z.string().trim().max(64)),
  timezone: TimezoneSchema.default(DEFAULT_ORGANIZATION_SETTINGS.timezone),
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

export const CompleteOrganizationOnboardingInputSchema = z
  .object({
    baseCurrencyCode: CurrencyCodeSchema.default(DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode),
    booksStartDate: z.iso.date(),
    countryCode: CountryCodeSchema.default(DEFAULT_ORGANIZATION_SETTINGS.countryCode),
    initialFiscalYearEndDate: z.iso.date(),
    legalName: z.string().trim().min(1).max(240),
    primaryEmail: nullableTextInput(z.email().trim().max(320)),
    primaryPhone: nullableTextInput(z.string().trim().max(64)),
    timezone: TimezoneSchema.default(DEFAULT_ORGANIZATION_SETTINGS.timezone),
    tradeName: nullableTextInput(z.string().trim().max(240)),
    ...orgSlugReferenceShape
  })
  .strict()
  .refine((input) => isLastDayOfMonth(input.initialFiscalYearEndDate), {
    path: ["initialFiscalYearEndDate"]
  })
  .refine((input) => input.booksStartDate <= input.initialFiscalYearEndDate, {
    path: ["initialFiscalYearEndDate"]
  });
export type CompleteOrganizationOnboardingInput = z.infer<
  typeof CompleteOrganizationOnboardingInputSchema
>;

function isLastDayOfMonth(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);

  return day === getLastDayOfMonth(year, month);
}

function getLastDayOfMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
