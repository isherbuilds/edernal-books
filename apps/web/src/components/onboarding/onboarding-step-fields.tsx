import { Controller, useFormContext } from "react-hook-form";

import { DEFAULT_ORGANIZATION_SETTINGS } from "@tsu-stack/core/organizations";
import { m } from "@tsu-stack/i18n/messages";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { type OnboardingFormInput, type OnboardingFormValues } from "@/utils/onboarding";
import { countryCodeOptions, currencyCodeOptions } from "@/utils/organization-settings-options";

import { FormSelectField, FormTextField } from "@/components/form-fields";

export function BusinessDetailsFields() {
  const {
    control,
    formState: { errors },
    register
  } = useFormContext<OnboardingFormInput, unknown, OnboardingFormValues>();

  return (
    <FieldGroup>
      <FormTextField
        error={errors.legalName}
        label={m.onboarding_page__legal_name()}
        placeholder={m.onboarding_page__legal_name_placeholder()}
        required
        {...register("legalName")}
      />

      <FormTextField
        error={errors.tradeName}
        label={m.business_settings__trade_name()}
        placeholder={m.business_settings__trade_name_placeholder()}
        {...register("tradeName")}
      />

      <FormTextField
        description={m.onboarding_page__books_start_date_hint()}
        error={errors.booksStartDate}
        label={m.onboarding_page__books_start_date()}
        required
        type="date"
        {...register("booksStartDate")}
      />

      <FormTextField
        error={errors.initialFiscalYearEndDate}
        label={m.onboarding_page__fiscal_year_end()}
        required
        type="date"
        {...register("initialFiscalYearEndDate")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="countryCode"
          render={({ field, fieldState }) => (
            <FormSelectField
              error={fieldState.error}
              label={m.onboarding_page__country()}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={(value) => {
                if (value) {
                  field.onChange(value);
                }
              }}
              options={countryCodeOptions}
              value={field.value ?? DEFAULT_ORGANIZATION_SETTINGS.countryCode}
            />
          )}
        />

        <Controller
          control={control}
          name="baseCurrencyCode"
          render={({ field, fieldState }) => (
            <FormSelectField
              error={fieldState.error}
              label={m.onboarding_page__base_currency()}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={(value) => {
                if (value) {
                  field.onChange(value);
                }
              }}
              options={currencyCodeOptions}
              value={field.value ?? DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode}
            />
          )}
        />
      </div>
    </FieldGroup>
  );
}

export function BusinessContactFields() {
  const {
    formState: { errors },
    register
  } = useFormContext<OnboardingFormInput, unknown, OnboardingFormValues>();

  return (
    <FieldGroup>
      <FormTextField
        description={m.onboarding_page__primary_email_hint()}
        error={errors.primaryEmail}
        label={m.onboarding_page__primary_email()}
        placeholder={m.onboarding_page__primary_email_placeholder()}
        type="email"
        {...register("primaryEmail")}
      />

      <FormTextField
        error={errors.primaryPhone}
        label={m.business_settings__primary_phone()}
        placeholder="+91 98765 43210"
        {...register("primaryPhone")}
      />
    </FieldGroup>
  );
}
