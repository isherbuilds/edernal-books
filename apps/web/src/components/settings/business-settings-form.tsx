import { SaveIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { type z } from "zod";

import {
  DEFAULT_ORGANIZATION_SETTINGS,
  type OrganizationSetting,
  type UpsertOrganizationSettingInput,
  UpsertOrganizationSettingInputSchema
} from "@tsu-stack/core/organizations";
import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { getDateInputValue } from "@/utils/form-input";
import {
  countryCodeOptions,
  currencyCodeOptions,
  timezoneOptions
} from "@/utils/organization-settings-options";

import { useZodForm } from "@/hooks/use-zod-form";

import { FormSelectField, FormTextField } from "@/components/form-fields";

type BusinessSettingsFormProps = {
  className?: string;
  disabled?: boolean;
  onSubmit: (input: UpsertOrganizationSettingInput) => Promise<void> | void;
  orgSlug: string;
  setting?: OrganizationSetting | null;
  submitLabel: string;
};

type BusinessSettingsFormValues = z.input<typeof UpsertOrganizationSettingInputSchema>;

export function BusinessSettingsForm({
  className,
  disabled = false,
  onSubmit: saveSettings,
  orgSlug,
  setting,
  submitLabel
}: BusinessSettingsFormProps) {
  const form = useZodForm(UpsertOrganizationSettingInputSchema, {
    defaultValues: getBusinessSettingsDefaultValues(orgSlug, setting)
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = form;
  const handleSave = handleSubmit(async (input) => {
    await saveSettings(input);
  });

  return (
    <form className={cn("flex flex-col gap-5", className)} noValidate onSubmit={handleSave}>
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <FormTextField
          disabled={disabled}
          error={errors.legalName}
          label={m.business_settings__legal_name()}
          placeholder={m.business_settings__legal_name_placeholder()}
          required
          {...register("legalName")}
        />

        <FormTextField
          disabled={disabled}
          error={errors.tradeName}
          label={m.business_settings__trade_name()}
          placeholder={m.business_settings__trade_name_placeholder()}
          {...register("tradeName")}
        />

        <FormTextField
          description={m.business_settings__books_start_date_hint()}
          disabled={disabled}
          error={errors.booksStartDate}
          label={m.business_settings__books_start_date()}
          required
          type="date"
          {...register("booksStartDate")}
        />

        <Controller
          control={control}
          name="baseCurrencyCode"
          render={({ field, fieldState }) => (
            <FormSelectField
              disabled={disabled}
              error={fieldState.error}
              label={m.business_settings__base_currency()}
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

        <Controller
          control={control}
          name="countryCode"
          render={({ field, fieldState }) => (
            <FormSelectField
              disabled={disabled}
              error={fieldState.error}
              label={m.business_settings__country()}
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
          name="timezone"
          render={({ field, fieldState }) => (
            <FormSelectField
              disabled={disabled}
              error={fieldState.error}
              label={m.business_settings__timezone()}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={(value) => {
                if (value) {
                  field.onChange(value);
                }
              }}
              options={timezoneOptions}
              value={field.value ?? DEFAULT_ORGANIZATION_SETTINGS.timezone}
            />
          )}
        />

        <FormTextField
          disabled={disabled}
          error={errors.primaryEmail}
          label={m.business_settings__primary_email()}
          placeholder="accounts@example.com"
          type="email"
          {...register("primaryEmail", {
            setValueAs: (value: string) => {
              const trimmed = value.trim();
              return trimmed === "" ? null : trimmed;
            }
          })}
        />

        <FormTextField
          disabled={disabled}
          error={errors.primaryPhone}
          label={m.business_settings__primary_phone()}
          placeholder="+91 98765 43210"
          {...register("primaryPhone")}
        />
      </FieldGroup>

      <div className="flex items-center justify-end">
        <Button className="min-w-32" disabled={disabled || isSubmitting} type="submit">
          {disabled || isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon aria-hidden="true" data-icon="inline-start" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function getBusinessSettingsDefaultValues(
  orgSlug: string,
  setting?: OrganizationSetting | null
): BusinessSettingsFormValues {
  return {
    baseCurrencyCode: setting?.baseCurrencyCode ?? DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode,
    booksStartDate: setting?.booksStartDate ?? getDateInputValue(),
    countryCode: setting?.countryCode ?? DEFAULT_ORGANIZATION_SETTINGS.countryCode,
    fiscalYearStartMonth:
      setting?.fiscalYearStartMonth ?? DEFAULT_ORGANIZATION_SETTINGS.fiscalYearStartMonth,
    legalName: setting?.legalName ?? "",
    orgSlug,
    primaryEmail: setting?.primaryEmail ?? null,
    primaryPhone: setting?.primaryPhone ?? null,
    timezone: setting?.timezone ?? DEFAULT_ORGANIZATION_SETTINGS.timezone,
    tradeName: setting?.tradeName ?? ""
  };
}
