import {
  SUPPORTED_ORGANIZATION_COUNTRY_CODES,
  SUPPORTED_ORGANIZATION_CURRENCY_CODES,
  SUPPORTED_ORGANIZATION_TIMEZONES
} from "@tsu-stack/core/organizations";

type SelectOption = {
  label: string;
  value: string;
};

function toSelectOption(value: string): SelectOption {
  return { label: value, value };
}

export const currencyCodeOptions = SUPPORTED_ORGANIZATION_CURRENCY_CODES.map(toSelectOption);
export const countryCodeOptions = SUPPORTED_ORGANIZATION_COUNTRY_CODES.map(toSelectOption);
export const timezoneOptions = SUPPORTED_ORGANIZATION_TIMEZONES.map(toSelectOption);
