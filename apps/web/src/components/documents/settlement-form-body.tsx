import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";

import { formatMinorUnits, parseDecimalAmountToMinorUnits } from "@/utils/accounting-format";

import {
  DocumentEditorCard,
  DocumentEditorFooter,
  DocumentEditorSection
} from "@/components/documents/document-editor-frame";
import {
  type DisplayedAllocationTarget,
  type SettlementFormOption,
  type SettlementFormValues
} from "@/components/documents/settlement-form-types";
import { FormComboboxField, FormSelectField, FormTextField } from "@/components/form-fields";

type SettlementFormBodyProps = {
  allocatedMinor: bigint;
  allocationPagination: {
    hasNextPage: boolean;
    loadingNextPage: boolean;
    onLoadMore: () => void;
  };
  allocations: Record<string, string>;
  amountMinor: string | null;
  cashAccountOptions: SettlementFormOption[];
  control: Control<SettlementFormValues>;
  displayedTargets: DisplayedAllocationTarget[];
  errors: FieldErrors<SettlementFormValues>;
  onAllocationChange: (targetId: string, value: string) => void;
  onPartyChanged: () => void;
  onPost: () => void;
  onSaveDraft: () => void;
  partyLabel: string;
  partyLoading: boolean;
  partyOptions: SettlementFormOption[];
  partyPlaceholder: string;
  partySearch: string;
  paymentModeOptions: SettlementFormOption[];
  postLabel: string;
  register: UseFormRegister<SettlementFormValues>;
  setPartySearch: (value: string) => void;
  showAllocationPanel: boolean;
  saving: {
    posting: boolean;
    savingDraft: boolean;
  };
};

export function SettlementFormBody({
  allocatedMinor,
  allocationPagination,
  allocations,
  amountMinor,
  cashAccountOptions,
  control,
  displayedTargets,
  errors,
  onAllocationChange,
  onPartyChanged,
  onPost,
  onSaveDraft,
  partyLabel,
  partyLoading,
  partyOptions,
  partyPlaceholder,
  partySearch,
  paymentModeOptions,
  postLabel,
  register,
  setPartySearch,
  showAllocationPanel,
  saving
}: SettlementFormBodyProps) {
  return (
    <DocumentEditorCard noValidate onSubmit={onSaveDraft}>
      <DocumentEditorSection title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="partyId"
            render={({ field, fieldState }) => (
              <FormComboboxField
                error={fieldState.error}
                inputValue={partySearch}
                items={partyOptions}
                label={partyLabel}
                loading={partyLoading}
                manualFiltering
                name={field.name}
                onInputValueChange={setPartySearch}
                onValueChange={(value) => {
                  const nextPartyId = value ?? "";
                  if (nextPartyId !== field.value) {
                    onPartyChanged();
                  }
                  field.onChange(nextPartyId);
                }}
                placeholder={partyPlaceholder}
                value={field.value === "" ? null : field.value}
              />
            )}
          />
          <FormTextField
            error={errors.settlementDate}
            label="Date"
            type="date"
            {...register("settlementDate")}
          />
          <FormTextField
            error={errors.amount}
            inputMode="decimal"
            label="Amount"
            placeholder="0.00"
            {...register("amount")}
          />
          <Controller
            control={control}
            name="cashAccountId"
            render={({ field, fieldState }) => (
              <FormSelectField
                error={fieldState.error}
                label="Cash / bank account"
                name={field.name}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value ?? "")}
                options={cashAccountOptions}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="paymentMode"
            render={({ field, fieldState }) => (
              <FormSelectField
                error={fieldState.error}
                label="Payment mode"
                name={field.name}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value ?? "")}
                options={paymentModeOptions}
                value={field.value}
              />
            )}
          />
        </div>
      </DocumentEditorSection>

      {showAllocationPanel ? (
        <DocumentEditorSection
          action={
            <span className="text-xs text-muted-foreground">
              Allocated {formatMinorUnits(allocatedMinor.toString())} of{" "}
              {formatMinorUnits((amountMinor ?? "0").toString())}
            </span>
          }
          title="Allocate to outstanding documents"
        >
          <div className="-mx-4 flex flex-col divide-y border-t sm:-mx-5">
            {displayedTargets.map((target) => {
              const parsedAllocation = parseDecimalAmountToMinorUnits(allocations[target.id] ?? "");
              const exceedsOutstanding =
                !target.unavailable &&
                target.outstandingMinor !== undefined &&
                parsedAllocation.ok &&
                parsedAllocation.value !== null &&
                BigInt(parsedAllocation.value) > BigInt(target.outstandingMinor);

              return (
                <div
                  className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:px-5"
                  key={target.id}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {target.documentNumber ?? "Existing allocation"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {target.unavailable
                        ? "No longer open"
                        : `${target.documentDate} · Outstanding ${formatMinorUnits(
                            target.outstandingMinor ?? "0"
                          )}`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="sr-only" htmlFor={`allocation-${target.id}`}>
                      Allocation for {target.documentNumber}
                    </Label>
                    <Input
                      aria-invalid={exceedsOutstanding ? true : undefined}
                      className="sm:w-40"
                      id={`allocation-${target.id}`}
                      inputMode="decimal"
                      onChange={(event) => onAllocationChange(target.id, event.target.value)}
                      placeholder="0.00"
                      value={allocations[target.id] ?? ""}
                    />
                    {exceedsOutstanding ? (
                      <span className="text-xs text-destructive">Exceeds outstanding</span>
                    ) : null}
                    {target.unavailable ? (
                      <span className="text-xs text-destructive">Clear this allocation</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {allocationPagination.hasNextPage ? (
              <div className="px-4 py-3 sm:px-5">
                <Button
                  disabled={allocationPagination.loadingNextPage}
                  onClick={allocationPagination.onLoadMore}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {allocationPagination.loadingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </DocumentEditorSection>
      ) : null}

      <DocumentEditorSection title="Reference & notes">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormTextField error={errors.reference} label="Reference" {...register("reference")} />
          <FormTextField error={errors.notes} label="Notes" {...register("notes")} />
        </div>
      </DocumentEditorSection>

      <DocumentEditorFooter
        isPosting={saving.posting}
        isSavingDraft={saving.savingDraft}
        onPost={onPost}
        onSaveDraft={onSaveDraft}
        postLabel={postLabel}
        summary={
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="font-amount text-lg tabular-nums">
              {formatMinorUnits((amountMinor ?? "0").toString())}
            </span>
          </div>
        }
      />
    </DocumentEditorCard>
  );
}
