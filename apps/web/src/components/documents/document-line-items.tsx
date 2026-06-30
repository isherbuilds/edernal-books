import { PlusIcon, Trash2Icon } from "lucide-react";
import { type ComponentProps } from "react";
import {
  type Control,
  Controller,
  type FieldError,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch
} from "react-hook-form";

import { Button } from "@tsu-stack/ui/components/button";
import { type ComboboxItem } from "@tsu-stack/ui/components/combobox";
import { Input } from "@tsu-stack/ui/components/input";

import { formatMinorUnits } from "@/utils/accounting-format";

import {
  type DocumentLinesFormValues,
  createEmptyLine,
  lineTotalMinor
} from "@/components/documents/document-editor-form";
import {
  FormComboboxField,
  FormSelectField,
  type FormSelectOption
} from "@/components/form-fields";

export type DocumentItemOption = ComboboxItem & {
  accountId: string | null;
  description: string;
  hsnCode: string | null;
  rateMinor: string | null;
  unit: string | null;
};

type DocumentLineItemsProps = {
  accountLabel: string;
  accountOptions: FormSelectOption[];
  itemInputValue?: string;
  itemOptions: DocumentItemOption[];
  itemOptionsLoading?: boolean;
  onItemInputValueChange?: (value: string) => void;
  rateToInput: (rateMinor: string) => string;
};

export function DocumentLineItems({
  accountLabel,
  accountOptions,
  itemInputValue,
  itemOptions,
  itemOptionsLoading,
  onItemInputValueChange,
  rateToInput
}: DocumentLineItemsProps) {
  const { control, register, setValue } = useFormContext<DocumentLinesFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex flex-col divide-y border-y sm:-mx-5">
        {fields.map((field, index) => (
          <DocumentLineRow
            accountLabel={accountLabel}
            accountOptions={accountOptions}
            canRemove={fields.length > 1}
            control={control}
            index={index}
            itemInputValue={itemInputValue}
            itemOptions={itemOptions}
            itemOptionsLoading={itemOptionsLoading}
            key={field.id}
            onItemInputValueChange={onItemInputValueChange}
            onRemove={() => remove(index)}
            rateToInput={rateToInput}
            register={register}
            setValue={setValue}
          />
        ))}
      </div>
      <div>
        <Button onClick={() => append(createEmptyLine())} size="sm" type="button" variant="outline">
          <PlusIcon data-icon="inline-start" />
          Add line
        </Button>
      </div>
    </div>
  );
}

type DocumentLineRowProps = {
  accountLabel: string;
  accountOptions: FormSelectOption[];
  canRemove: boolean;
  control: Control<DocumentLinesFormValues>;
  index: number;
  itemInputValue?: string;
  itemOptions: DocumentItemOption[];
  itemOptionsLoading?: boolean;
  onItemInputValueChange?: (value: string) => void;
  onRemove: () => void;
  rateToInput: (rateMinor: string) => string;
  register: UseFormRegister<DocumentLinesFormValues>;
  setValue: UseFormSetValue<DocumentLinesFormValues>;
};

function DocumentLineRow({
  accountLabel,
  accountOptions,
  canRemove,
  control,
  index,
  itemInputValue,
  itemOptions,
  itemOptionsLoading,
  onItemInputValueChange,
  onRemove,
  rateToInput,
  register,
  setValue
}: DocumentLineRowProps) {
  const line = useWatch({ control, name: `lines.${index}` });
  const { errors } = useFormState({ control, name: `lines.${index}` });
  const lineErrors = errors.lines?.[index];
  const total = line ? lineTotalMinor(line) : null;

  const applyItem = (itemId: string | null) => {
    setValue(`lines.${index}.itemId`, itemId ?? "");

    if (!itemId) {
      return;
    }

    const selected = itemOptions.find((option) => option.value === itemId);
    if (!selected) {
      return;
    }

    setValue(`lines.${index}.description`, selected.description, { shouldValidate: true });
    setValue(`lines.${index}.unit`, selected.unit ?? "");
    setValue(`lines.${index}.hsnCode`, selected.hsnCode ?? "");
    setValue(`lines.${index}.rate`, selected.rateMinor ? rateToInput(selected.rateMinor) : "", {
      shouldValidate: true
    });
    setValue(`lines.${index}.accountId`, selected.accountId ?? "", { shouldValidate: true });
  };

  return (
    <div className="bg-card px-4 py-3 transition-colors hover:bg-muted/30 sm:px-5">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_0.8fr]">
            <Controller
              control={control}
              name={`lines.${index}.itemId`}
              render={({ field }) => (
                <FormComboboxField
                  items={itemOptions}
                  label="Item"
                  loading={itemOptionsLoading}
                  manualFiltering
                  name={field.name}
                  onInputValueChange={onItemInputValueChange}
                  onValueChange={applyItem}
                  placeholder="Search items…"
                  inputValue={itemInputValue}
                  value={field.value === "" ? null : field.value}
                />
              )}
            />
            <FormTextRowField
              error={lineErrors?.description}
              label="Description"
              {...register(`lines.${index}.description`)}
            />
            <FormTextRowField
              error={lineErrors?.hsnCode}
              label="HSN / SAC"
              placeholder="—"
              {...register(`lines.${index}.hsnCode`)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FormTextRowField
              error={lineErrors?.quantity}
              label="Qty"
              {...register(`lines.${index}.quantity`)}
            />
            <FormTextRowField
              error={lineErrors?.unit}
              label="Unit"
              placeholder="pcs"
              {...register(`lines.${index}.unit`)}
            />
            <FormTextRowField
              error={lineErrors?.rate}
              inputMode="decimal"
              label="Rate"
              placeholder="0.00"
              {...register(`lines.${index}.rate`)}
            />
            <Controller
              control={control}
              name={`lines.${index}.accountId`}
              render={({ field, fieldState }) => (
                <FormSelectField
                  error={fieldState.error}
                  label={accountLabel}
                  name={field.name}
                  onBlur={field.onBlur}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  options={accountOptions}
                  value={field.value}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="font-amount text-sm tabular-nums">
              {total === null ? "—" : formatMinorUnits(total.toString())}
            </span>
          </div>
        </div>
        <Button
          aria-label="Remove line"
          className="mt-1"
          disabled={!canRemove}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

type FormTextRowFieldProps = ComponentProps<typeof Input> & {
  error?: FieldError;
  label: string;
};

function FormTextRowField({ error, label, name, ...inputProps }: FormTextRowFieldProps) {
  const id = typeof name === "string" ? name : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <Input aria-invalid={error ? true : undefined} id={id} name={name} {...inputProps} />
      {error?.message ? <span className="text-xs text-destructive">{error.message}</span> : null}
    </div>
  );
}
