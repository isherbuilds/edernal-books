import {
  ORGANIZATION_FISCAL_YEAR_START_MONTHS,
  SUPPORTED_ORGANIZATION_COUNTRY_CODES,
  SUPPORTED_ORGANIZATION_CURRENCY_CODES,
  SUPPORTED_ORGANIZATION_TIMEZONES
} from "@tsu-stack/core/organizations";
import { m } from "@tsu-stack/i18n/messages";

type SelectOption = {
  label: string;
  value: string;
};

const MONTH_LABELS = {
  1: m.month__january,
  2: m.month__february,
  3: m.month__march,
  4: m.month__april,
  5: m.month__may,
  6: m.month__june,
  7: m.month__july,
  8: m.month__august,
  9: m.month__september,
  10: m.month__october,
  11: m.month__november,
  12: m.month__december
} as const;

function toSelectOption(value: string): SelectOption {
  return { label: value, value };
}

export function getFiscalYearStartMonthOptions() {
  return ORGANIZATION_FISCAL_YEAR_START_MONTHS.map((month): SelectOption => {
    return {
      label: MONTH_LABELS[month](),
      value: String(month)
    };
  });
}

export const currencyCodeOptions = SUPPORTED_ORGANIZATION_CURRENCY_CODES.map(toSelectOption);
export const countryCodeOptions = SUPPORTED_ORGANIZATION_COUNTRY_CODES.map(toSelectOption);
export const timezoneOptions = SUPPORTED_ORGANIZATION_TIMEZONES.map(toSelectOption);
