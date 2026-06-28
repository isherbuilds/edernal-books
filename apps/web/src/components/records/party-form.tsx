import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  type GstRegistrationType,
  type Party,
  type PartyKind,
  GST_REGISTRATION_TYPES,
  GstRegistrationTypeSchema,
  GstinSchema,
  PARTY_KINDS,
  PanSchema,
  PartyCountryCodeSchema,
  PartyKindSchema
} from "@tsu-stack/core/parties";
import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { optionalCoreField } from "@/utils/form-input";

import { useCreatePartyMutation, useUpdatePartyMutation } from "@/hooks/use-records";
import { useZodForm } from "@/hooks/use-zod-form";

import { FormSelectField, FormTextField } from "@/components/form-fields";
import { handleRecordMutationError } from "@/components/records/record-error";

function createPartyFormSchema() {
  const optionalText = (maxLength: number) => z.string().trim().max(maxLength);

  return z.object({
    addressLine1: optionalText(240),
    addressLine2: optionalText(240),
    city: optionalText(120),
    countryCode: optionalCoreField(
      PartyCountryCodeSchema,
      m.owner_records__parties_country_invalid()
    ),
    displayName: z
      .string()
      .trim()
      .min(1, { message: m.owner_records__parties_display_name_required() })
      .max(240),
    email: optionalCoreField(z.email().max(320), m.owner_records__parties_email_invalid()),
    gstRegistrationType: GstRegistrationTypeSchema,
    gstin: optionalCoreField(GstinSchema, m.owner_records__parties_gstin_invalid()),
    kind: PartyKindSchema,
    legalName: optionalText(240),
    pan: optionalCoreField(PanSchema, m.owner_records__parties_pan_invalid()),
    phone: optionalText(64),
    postalCode: optionalText(24),
    state: optionalText(120)
  });
}

type PartyFormValues = z.input<ReturnType<typeof createPartyFormSchema>>;

const PARTY_FORM_DEFAULTS: PartyFormValues = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  countryCode: "IN",
  displayName: "",
  email: "",
  gstRegistrationType: "unregistered",
  gstin: "",
  kind: "customer",
  legalName: "",
  pan: "",
  phone: "",
  postalCode: "",
  state: ""
};

export function partyKindLabel(kind: PartyKind): string {
  switch (kind) {
    case "customer":
      return m.owner_records__party_kind_customer();
    case "vendor":
      return m.owner_records__party_kind_vendor();
    case "both":
      return m.owner_records__party_kind_both();
  }
}

export const PARTY_KIND_OPTIONS = PARTY_KINDS.map((value) => {
  return {
    label: partyKindLabel(value),
    value
  };
});

export function gstRegistrationTypeLabel(type: GstRegistrationType): string {
  switch (type) {
    case "registered_regular":
      return m.owner_records__gst_type_registered_regular();
    case "registered_composition":
      return m.owner_records__gst_type_registered_composition();
    case "unregistered":
      return m.owner_records__gst_type_unregistered();
    case "consumer":
      return m.owner_records__gst_type_consumer();
  }
}

export const GST_REGISTRATION_TYPE_OPTIONS = GST_REGISTRATION_TYPES.map((value) => {
  return {
    label: gstRegistrationTypeLabel(value),
    value
  };
});

function toFormValues(party: Party | null | undefined): PartyFormValues {
  if (!party) {
    return PARTY_FORM_DEFAULTS;
  }

  return {
    addressLine1: party.addressLine1 ?? "",
    addressLine2: party.addressLine2 ?? "",
    city: party.city ?? "",
    countryCode: party.countryCode ?? "",
    displayName: party.displayName,
    email: party.email ?? "",
    gstRegistrationType: party.gstRegistrationType,
    gstin: party.gstin ?? "",
    kind: party.kind,
    legalName: party.legalName ?? "",
    pan: party.pan ?? "",
    phone: party.phone ?? "",
    postalCode: party.postalCode ?? "",
    state: party.state ?? ""
  };
}

type PartyFormProps = {
  onClose: () => void;
  orgSlug: string;
  party?: Party | null;
};

export function PartyForm({ onClose, orgSlug, party }: PartyFormProps) {
  const isEdit = Boolean(party);
  const form = useZodForm(createPartyFormSchema(), { defaultValues: toFormValues(party) });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError
  } = form;

  const createParty = useCreatePartyMutation();
  const updateParty = useUpdatePartyMutation();
  const isPending = isSubmitting || createParty.isPending || updateParty.isPending;

  const submit = handleSubmit((values) => {
    const payload = {
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      city: values.city,
      countryCode: values.countryCode,
      displayName: values.displayName,
      email: values.email,
      gstRegistrationType: values.gstRegistrationType,
      gstin: values.gstin,
      kind: values.kind,
      legalName: values.legalName,
      pan: values.pan,
      phone: values.phone,
      postalCode: values.postalCode,
      state: values.state
    };

    const onError = (error: unknown) =>
      handleRecordMutationError(error, {
        onDuplicateName: () =>
          setError("displayName", { message: m.owner_records__parties_duplicate_name() }),
        onFallback: () =>
          toast.error(
            error instanceof Error ? error.message : m.owner_records__parties_save_error()
          )
      });

    if (party) {
      updateParty.mutate(
        { id: party.id, orgSlug, ...payload },
        {
          onError,
          onSuccess: () => {
            toast.success(m.owner_records__parties_updated());
            onClose();
          }
        }
      );
      return;
    }

    createParty.mutate(
      { orgSlug, ...payload },
      {
        onError,
        onSuccess: () => {
          reset(PARTY_FORM_DEFAULTS);
          toast.success(m.owner_records__parties_saved());
          onClose();
        }
      }
    );
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
      <Controller
        control={control}
        name="kind"
        render={({ field, fieldState }) => (
          <FormSelectField
            error={fieldState.error}
            label={m.owner_records__parties_kind_label()}
            name={field.name}
            onBlur={field.onBlur}
            onValueChange={(value) => {
              if (value) {
                field.onChange(value);
              }
            }}
            options={PARTY_KIND_OPTIONS}
            value={field.value}
          />
        )}
      />
      <FormTextField
        error={errors.displayName}
        label={m.owner_records__parties_display_name_label()}
        placeholder={m.owner_records__parties_display_name_placeholder()}
        required
        {...register("displayName")}
      />
      <FormTextField
        error={errors.legalName}
        label={m.owner_records__parties_legal_name_label()}
        placeholder={m.owner_records__parties_legal_name_placeholder()}
        {...register("legalName")}
      />
      <FormTextField
        error={errors.email}
        label={m.owner_records__parties_email_label()}
        placeholder={m.owner_records__parties_email_placeholder()}
        type="email"
        {...register("email")}
      />
      <FormTextField
        error={errors.phone}
        label={m.owner_records__parties_phone_label()}
        placeholder={m.owner_records__parties_phone_placeholder()}
        {...register("phone")}
      />
      <FormTextField
        error={errors.addressLine1}
        label={m.owner_records__parties_address_line1_label()}
        placeholder={m.owner_records__parties_address_line1_placeholder()}
        {...register("addressLine1")}
      />
      <FormTextField
        error={errors.addressLine2}
        label={m.owner_records__parties_address_line2_label()}
        placeholder={m.owner_records__parties_address_line2_placeholder()}
        {...register("addressLine2")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          error={errors.city}
          label={m.owner_records__parties_city_label()}
          placeholder={m.owner_records__parties_city_placeholder()}
          {...register("city")}
        />
        <FormTextField
          error={errors.state}
          label={m.owner_records__parties_state_label()}
          placeholder={m.owner_records__parties_state_placeholder()}
          {...register("state")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_88px]">
        <FormTextField
          error={errors.postalCode}
          label={m.owner_records__parties_postal_code_label()}
          placeholder={m.owner_records__parties_postal_code_placeholder()}
          {...register("postalCode")}
        />
        <FormTextField
          className="uppercase"
          error={errors.countryCode}
          label={m.owner_records__parties_country_label()}
          maxLength={2}
          placeholder={m.owner_records__parties_country_placeholder()}
          {...register("countryCode")}
        />
      </div>
      <Controller
        control={control}
        name="gstRegistrationType"
        render={({ field, fieldState }) => (
          <FormSelectField
            error={fieldState.error}
            label={m.owner_records__parties_gst_type_label()}
            name={field.name}
            onBlur={field.onBlur}
            onValueChange={(value) => {
              if (value) {
                field.onChange(value);
              }
            }}
            options={GST_REGISTRATION_TYPE_OPTIONS}
            value={field.value}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          className="uppercase"
          error={errors.gstin}
          label={m.owner_records__parties_gstin_label()}
          maxLength={15}
          placeholder={m.owner_records__parties_gstin_placeholder()}
          {...register("gstin")}
        />
        <FormTextField
          className="uppercase"
          error={errors.pan}
          label={m.owner_records__parties_pan_label()}
          maxLength={10}
          placeholder={m.owner_records__parties_pan_placeholder()}
          {...register("pan")}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onClose} type="button" variant="ghost">
          {m.owner_records__cancel()}
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isEdit ? m.owner_records__save_changes() : m.owner_records__parties_submit()}
        </Button>
      </div>
    </form>
  );
}
