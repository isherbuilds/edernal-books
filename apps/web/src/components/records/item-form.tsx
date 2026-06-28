import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { NonNegativeMinorUnitStringSchema } from "@tsu-stack/core/accounting";
import {
  HsnCodeSchema,
  type Item,
  type ItemKind,
  ITEM_KINDS,
  ItemKindSchema,
  type ItemUsage,
  ITEM_USAGES,
  ItemUsageSchema
} from "@tsu-stack/core/items";
import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { minorUnitsToDecimalString, parseDecimalRateToMinorUnits } from "@/utils/accounting-format";

import { useCreateItemMutation, useUpdateItemMutation } from "@/hooks/use-records";
import { useZodForm } from "@/hooks/use-zod-form";

import { AccountSearchSelect } from "@/components/accounting/account-search-select";
import { FormSelectField, FormTextField } from "@/components/form-fields";
import { handleRecordMutationError } from "@/components/records/record-error";

function itemRateSchema() {
  return z.string().refine(
    (value) => {
      const parsed = parseDecimalRateToMinorUnits(value);

      return (
        parsed.ok &&
        (parsed.value === null || NonNegativeMinorUnitStringSchema.safeParse(parsed.value).success)
      );
    },
    {
      message: m.owner_records__items_rate_invalid()
    }
  );
}

function hsnCodeSchema() {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || HsnCodeSchema.safeParse(value).success, {
      message: m.owner_records__items_hsn_invalid()
    });
}

function createItemFormSchema() {
  return z.object({
    description: z.string().trim().max(1000),
    expenseAccountId: z.string(),
    hsnCode: hsnCodeSchema(),
    kind: ItemKindSchema,
    name: z.string().trim().min(1, { message: m.owner_records__items_name_required() }).max(240),
    purchaseRate: itemRateSchema(),
    salesAccountId: z.string(),
    salesRate: itemRateSchema(),
    unit: z.string(),
    usage: ItemUsageSchema
  });
}

type ItemFormValues = z.input<ReturnType<typeof createItemFormSchema>>;

const ITEM_FORM_DEFAULTS: ItemFormValues = {
  description: "",
  expenseAccountId: "",
  hsnCode: "",
  kind: "service",
  name: "",
  purchaseRate: "",
  salesAccountId: "",
  salesRate: "",
  unit: "nos",
  usage: "sales"
};

export function itemKindLabel(kind: ItemKind): string {
  switch (kind) {
    case "goods":
      return m.owner_records__item_kind_goods();
    case "service":
      return m.owner_records__item_kind_service();
  }
}

export function itemUsageLabel(usage: ItemUsage): string {
  switch (usage) {
    case "sales":
      return m.owner_records__item_usage_sales();
    case "purchases":
      return m.owner_records__item_usage_purchases();
    case "both":
      return m.owner_records__item_usage_both();
  }
}

export const ITEM_KIND_OPTIONS = ITEM_KINDS.map((value) => {
  return {
    label: itemKindLabel(value),
    value
  };
});

export const ITEM_USAGE_OPTIONS = ITEM_USAGES.map((value) => {
  return {
    label: itemUsageLabel(value),
    value
  };
});

function toFormValues(item: Item | null | undefined): ItemFormValues {
  if (!item) {
    return ITEM_FORM_DEFAULTS;
  }

  return {
    description: item.description ?? "",
    expenseAccountId: item.expenseAccountId ?? "",
    hsnCode: item.hsnCode ?? "",
    kind: item.kind,
    name: item.name,
    purchaseRate:
      item.purchaseRateMinor != null ? minorUnitsToDecimalString(item.purchaseRateMinor) : "",
    salesAccountId: item.salesAccountId ?? "",
    salesRate: item.salesRateMinor != null ? minorUnitsToDecimalString(item.salesRateMinor) : "",
    unit: item.unit ?? "",
    usage: item.usage
  };
}

type ItemFormProps = {
  item?: Item | null;
  onClose: () => void;
  orgSlug: string;
};

export function ItemForm({ item, onClose, orgSlug }: ItemFormProps) {
  const isEdit = Boolean(item);
  const form = useZodForm(createItemFormSchema(), { defaultValues: toFormValues(item) });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError
  } = form;

  const createItem = useCreateItemMutation();
  const updateItem = useUpdateItemMutation();
  const isPending = isSubmitting || createItem.isPending || updateItem.isPending;

  const submit = handleSubmit((values) => {
    const salesRate = parseDecimalRateToMinorUnits(values.salesRate);
    const purchaseRate = parseDecimalRateToMinorUnits(values.purchaseRate);

    if (!salesRate.ok) {
      setError("salesRate", { message: salesRate.message });
      return;
    }

    if (!purchaseRate.ok) {
      setError("purchaseRate", { message: purchaseRate.message });
      return;
    }

    const payload = {
      description: values.description,
      expenseAccountId: values.expenseAccountId || null,
      hsnCode: values.hsnCode,
      kind: values.kind,
      name: values.name,
      purchaseRateMinor: purchaseRate.value,
      salesAccountId: values.salesAccountId || null,
      salesRateMinor: salesRate.value,
      unit: values.unit,
      usage: values.usage
    };

    const onError = (error: unknown) =>
      handleRecordMutationError(error, {
        onAccountMismatch: () => toast.error(m.owner_records__items_account_mismatch()),
        onDuplicateName: () =>
          setError("name", { message: m.owner_records__items_duplicate_name() }),
        onFallback: () =>
          toast.error(error instanceof Error ? error.message : m.owner_records__items_save_error())
      });

    if (item) {
      updateItem.mutate(
        { id: item.id, orgSlug, ...payload },
        {
          onError,
          onSuccess: () => {
            toast.success(m.owner_records__items_updated());
            onClose();
          }
        }
      );
      return;
    }

    createItem.mutate(
      { orgSlug, ...payload },
      {
        onError,
        onSuccess: () => {
          reset(ITEM_FORM_DEFAULTS);
          toast.success(m.owner_records__items_saved());
          onClose();
        }
      }
    );
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="kind"
          render={({ field, fieldState }) => (
            <FormSelectField
              error={fieldState.error}
              label={m.owner_records__items_kind_label()}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={(value) => {
                if (value) {
                  field.onChange(value);
                }
              }}
              options={ITEM_KIND_OPTIONS}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="usage"
          render={({ field, fieldState }) => (
            <FormSelectField
              error={fieldState.error}
              label={m.owner_records__items_usage_label()}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={(value) => {
                if (value) {
                  field.onChange(value);
                }
              }}
              options={ITEM_USAGE_OPTIONS}
              value={field.value}
            />
          )}
        />
      </div>
      <FormTextField
        error={errors.name}
        label={m.owner_records__items_name_label()}
        placeholder={m.owner_records__items_name_placeholder()}
        required
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          error={errors.unit}
          label={m.owner_records__items_unit_label()}
          placeholder={m.owner_records__items_unit_placeholder()}
          {...register("unit")}
        />
        <FormTextField
          error={errors.hsnCode}
          inputMode="numeric"
          label={m.owner_records__items_hsn_label()}
          placeholder={m.owner_records__items_hsn_placeholder()}
          {...register("hsnCode")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          error={errors.salesRate}
          inputMode="decimal"
          label={m.owner_records__items_sales_rate_label()}
          placeholder={m.owner_records__items_rate_placeholder()}
          {...register("salesRate")}
        />
        <FormTextField
          error={errors.purchaseRate}
          inputMode="decimal"
          label={m.owner_records__items_purchase_rate_label()}
          placeholder={m.owner_records__items_rate_placeholder()}
          {...register("purchaseRate")}
        />
      </div>
      <Controller
        control={control}
        name="salesAccountId"
        render={({ field, fieldState }) => (
          <AccountSearchSelect
            emptyText={m.owner_records__items_account_empty()}
            error={fieldState.error}
            label={m.owner_records__items_sales_account_label()}
            name={field.name}
            onValueChange={(accountId) => field.onChange(accountId ?? "")}
            orgSlug={orgSlug}
            placeholder={m.owner_records__items_account_search_placeholder()}
            value={field.value || null}
          />
        )}
      />
      <Controller
        control={control}
        name="expenseAccountId"
        render={({ field, fieldState }) => (
          <AccountSearchSelect
            emptyText={m.owner_records__items_account_empty()}
            error={fieldState.error}
            label={m.owner_records__items_expense_account_label()}
            name={field.name}
            onValueChange={(accountId) => field.onChange(accountId ?? "")}
            orgSlug={orgSlug}
            placeholder={m.owner_records__items_account_search_placeholder()}
            value={field.value || null}
          />
        )}
      />
      <FormTextField
        error={errors.description}
        label={m.owner_records__items_description_label()}
        placeholder={m.owner_records__items_description_placeholder()}
        {...register("description")}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onClose} type="button" variant="ghost">
          {m.owner_records__cancel()}
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isEdit ? m.owner_records__save_changes() : m.owner_records__items_submit()}
        </Button>
      </div>
    </form>
  );
}
