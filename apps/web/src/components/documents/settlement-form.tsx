import { useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  type AllocationTarget,
  PAYMENT_MODES,
  type SettlementDirection,
  type SettlementDocument
} from "@tsu-stack/core/documents";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";

import {
  formatMinorUnits,
  getTodayDateString,
  minorUnitsToDecimalString,
  parseDecimalAmountToMinorUnits
} from "@/utils/accounting-format";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import {
  useAllocationTargetsQuery,
  useCreateAndPostSettlementMutation,
  useCreateSettlementDraftMutation,
  useUpdateAndPostSettlementMutation,
  useUpdateSettlementDraftMutation
} from "@/hooks/use-documents";
import { usePartiesQuery } from "@/hooks/use-records";
import { useZodForm } from "@/hooks/use-zod-form";

import {
  DocumentEditorCard,
  DocumentEditorFooter,
  DocumentEditorSection
} from "@/components/documents/document-editor-frame";
import { FormComboboxField, FormSelectField, FormTextField } from "@/components/form-fields";

const PAYMENT_MODE_LABELS: Record<(typeof PAYMENT_MODES)[number], string> = {
  bank_transfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
  upi: "UPI"
};

const paymentModeOptions = PAYMENT_MODES.map((mode) => {
  return {
    label: PAYMENT_MODE_LABELS[mode],
    value: mode
  };
});

const SETTLEMENT_DIRECTION_POLICY: Record<
  SettlementDirection,
  { partyLabel: string; partyPlaceholder: string; postLabel: string; title: string }
> = {
  paid: {
    partyLabel: "Paid to",
    partyPlaceholder: "Select a vendor...",
    postLabel: "Post payment",
    title: "Payment"
  },
  received: {
    partyLabel: "Received from",
    partyPlaceholder: "Select a customer...",
    postLabel: "Post receipt",
    title: "Receipt"
  }
};

type AllocationTargetInfo = {
  documentKind: AllocationTarget["documentKind"];
  documentDate?: string;
  documentNumber?: string;
  outstandingMinor?: string;
  unavailable?: boolean;
};

const settlementFormSchema = z.object({
  amount: z.string().refine((value) => {
    const parsed = parseDecimalAmountToMinorUnits(value);
    return parsed.ok && parsed.value !== null;
  }, "Enter an amount"),
  cashAccountId: z.string().min(1, "Select a cash/bank account"),
  notes: z.string(),
  partyId: z.string().min(1, "Select a party"),
  paymentMode: z.enum(PAYMENT_MODES),
  reference: z.string(),
  settlementDate: z.string().min(1, "Pick a date")
});

type SettlementFormValues = z.infer<typeof settlementFormSchema>;

type SettlementFormProps = {
  direction: SettlementDirection;
  document: SettlementDocument | null;
  onPosted: (documentId: string) => void;
  onSaved: (documentId: string) => void;
  orgSlug: string;
};

function toFormValues(document: SettlementDocument | null): SettlementFormValues {
  if (!document) {
    return {
      amount: "",
      cashAccountId: "",
      notes: "",
      partyId: "",
      paymentMode: "cash",
      reference: "",
      settlementDate: getTodayDateString()
    };
  }

  return {
    amount: minorUnitsToDecimalString(document.amountMinor),
    cashAccountId: document.cashAccountId,
    notes: document.notes ?? "",
    partyId: document.partyId,
    paymentMode: document.paymentMode,
    reference: document.reference ?? "",
    settlementDate: document.settlementDate
  };
}

function toAllocationState(document: SettlementDocument | null): Record<string, string> {
  if (!document) {
    return {};
  }

  return Object.fromEntries(
    document.allocations.map((allocation) => [
      allocation.targetDocumentId,
      minorUnitsToDecimalString(allocation.amountMinor)
    ])
  );
}

export function SettlementForm({
  direction,
  document,
  onPosted,
  onSaved,
  orgSlug
}: SettlementFormProps) {
  const { partyLabel, partyPlaceholder, postLabel, title } = SETTLEMENT_DIRECTION_POLICY[direction];
  const [partySearch, setPartySearch] = useState("");
  const partiesQuery = usePartiesQuery({
    orgSlug,
    q: partySearch.trim() === "" ? undefined : partySearch
  });
  const accountsQuery = useChartAccountsQuery(orgSlug);

  const createDraft = useCreateSettlementDraftMutation();
  const createAndPost = useCreateAndPostSettlementMutation(orgSlug);
  const updateDraft = useUpdateSettlementDraftMutation();
  const updateAndPost = useUpdateAndPostSettlementMutation(orgSlug);

  const form = useZodForm(settlementFormSchema, { defaultValues: toFormValues(document) });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    watch
  } = form;

  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    toAllocationState(document)
  );

  const partyOptions = useMemo(() => {
    const parties = partiesQuery.data?.pages.flatMap((page) => page.parties) ?? [];
    const matchesDirection =
      direction === "received"
        ? (kind: string) => kind === "customer" || kind === "both"
        : (kind: string) => kind === "vendor" || kind === "both";

    return parties
      .filter((party) => matchesDirection(party.kind))
      .map((party) => {
        return { label: party.displayName, value: party.id };
      });
  }, [direction, partiesQuery.data]);

  const cashAccountOptions = useMemo(() => {
    const accounts = accountsQuery.data?.accounts ?? [];
    return accounts
      .filter(
        (account) =>
          account.accountCategory === "asset" &&
          (account.accountType === "cash" || account.accountType === "bank") &&
          account.active &&
          !account.isGroup &&
          account.allowManualPosting
      )
      .map((account) => {
        return { label: account.name, value: account.id };
      });
  }, [accountsQuery.data]);

  const amount = watch("amount");
  const partyId = watch("partyId");

  const allocationTargetsQuery = useAllocationTargetsQuery(
    { direction, orgSlug, partyId },
    partyId !== ""
  );
  const targets = useMemo(
    () => allocationTargetsQuery.data?.pages.flatMap((page) => page.targets) ?? [],
    [allocationTargetsQuery.data]
  );
  const displayedTargets = useMemo(() => {
    const entries = new Map<string, AllocationTargetInfo>();

    for (const allocation of document?.allocations ?? []) {
      entries.set(allocation.targetDocumentId, {
        documentKind: allocation.targetDocumentKind,
        documentNumber: allocation.targetDocumentNumber ?? undefined,
        unavailable: true
      });
    }

    for (const target of targets) {
      entries.set(target.id, {
        documentKind: target.documentKind,
        documentDate: target.documentDate,
        documentNumber: target.documentNumber,
        outstandingMinor: target.outstandingMinor,
        unavailable: false
      });
    }

    return Array.from(entries, ([id, target]) => {
      return { id, ...target };
    });
  }, [document?.allocations, targets]);
  const allocationTargetsById = useMemo(
    () => new Map(displayedTargets.map((target) => [target.id, target])),
    [displayedTargets]
  );

  const amountMinor = useMemo(() => {
    const parsed = parseDecimalAmountToMinorUnits(amount);
    return parsed.ok ? parsed.value : null;
  }, [amount]);

  const allocatedMinor = useMemo(() => {
    let sum = 0n;

    for (const [targetId, amount] of Object.entries(allocations)) {
      if (allocationTargetsById.get(targetId)?.unavailable) {
        continue;
      }

      const parsed = parseDecimalAmountToMinorUnits(amount);
      if (parsed.ok && parsed.value !== null) {
        sum += BigInt(parsed.value);
      }
    }

    return sum;
  }, [allocationTargetsById, allocations]);

  const setAllocation = (targetId: string, value: string) => {
    setAllocations((current) => {
      return { ...current, [targetId]: value };
    });
  };

  const documentId = document?.id ?? null;

  const draftPayload = (values: SettlementFormValues) => {
    const parsedAmount = parseDecimalAmountToMinorUnits(values.amount);
    if (!parsedAmount.ok || parsedAmount.value === null) {
      toast.error("Enter an amount");
      return null;
    }
    const settlementAmountMinor = BigInt(parsedAmount.value);

    const allocationPayload: Array<{
      amountMinor: string;
      targetDocumentId: string;
      targetDocumentKind: (typeof targets)[number]["documentKind"];
    }> = [];

    for (const [targetId, allocationAmount] of Object.entries(allocations)) {
      const parsedAllocation = parseDecimalAmountToMinorUnits(allocationAmount);
      if (!parsedAllocation.ok) {
        toast.error(parsedAllocation.message);
        return null;
      }
      if (parsedAllocation.value === null || parsedAllocation.value === "0") {
        continue;
      }
      const target = allocationTargetsById.get(targetId);
      if (!target) {
        toast.error("Could not load allocation target");
        return null;
      }
      if (target.unavailable) {
        toast.error(`${target.documentNumber ?? "Allocation target"} is no longer open`);
        return null;
      }
      if (
        target.outstandingMinor &&
        BigInt(parsedAllocation.value) > BigInt(target.outstandingMinor)
      ) {
        toast.error(
          `Allocation for ${target.documentNumber ?? "document"} exceeds its outstanding amount`
        );
        return null;
      }
      allocationPayload.push({
        amountMinor: parsedAllocation.value,
        targetDocumentId: targetId,
        targetDocumentKind: target.documentKind
      });
    }

    const allocatedTotal = allocationPayload.reduce(
      (sum, allocation) => sum + BigInt(allocation.amountMinor),
      0n
    );
    if (allocatedTotal !== settlementAmountMinor) {
      toast.error("Allocated amount must equal the settlement amount");
      return null;
    }

    return {
      allocations: allocationPayload,
      amountMinor: parsedAmount.value,
      cashAccountId: values.cashAccountId,
      direction,
      notes: values.notes.trim() === "" ? null : values.notes.trim(),
      orgSlug,
      partyId: values.partyId,
      paymentMode: values.paymentMode,
      reference: values.reference.trim() === "" ? null : values.reference.trim(),
      settlementDate: values.settlementDate
    };
  };

  const persistDraft = (values: SettlementFormValues, onDone: (documentId: string) => void) => {
    const payload = draftPayload(values);
    if (!payload) {
      return;
    }

    const onError = (error: unknown) =>
      toast.error(error instanceof Error ? error.message : `Could not save ${title.toLowerCase()}`);

    if (documentId) {
      updateDraft.mutate(
        { documentId, ...payload },
        { onError, onSuccess: (saved) => onDone(saved.id) }
      );
      return;
    }

    createDraft.mutate(payload, { onError, onSuccess: (saved) => onDone(saved.id) });
  };

  const onSaveDraft = handleSubmit((values) => {
    persistDraft(values, (savedId) => {
      toast.success("Draft saved");
      onSaved(savedId);
    });
  });

  const onPost = handleSubmit((values) => {
    const payload = draftPayload(values);
    if (!payload) {
      return;
    }

    const mutationOptions = {
      onError: (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : `Could not post ${title.toLowerCase()}`
        ),
      onSuccess: (posted: { documentId: string }) => {
        toast.success(`${title} posted`);
        onPosted(posted.documentId);
      }
    };

    if (!documentId) {
      createAndPost.mutate(payload, mutationOptions);
      return;
    }

    updateAndPost.mutate({ documentId, ...payload }, mutationOptions);
  });

  const showAllocationPanel = partyId !== "" && displayedTargets.length > 0;

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
                loading={partiesQuery.isFetching}
                manualFiltering
                name={field.name}
                onInputValueChange={setPartySearch}
                onValueChange={(value) => {
                  const nextPartyId = value ?? "";
                  if (nextPartyId !== field.value) {
                    setAllocations({});
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
                      onChange={(event) => setAllocation(target.id, event.target.value)}
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
            {allocationTargetsQuery.hasNextPage ? (
              <div className="px-4 py-3 sm:px-5">
                <Button
                  disabled={allocationTargetsQuery.isFetchingNextPage}
                  onClick={() => allocationTargetsQuery.fetchNextPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {allocationTargetsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
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
        isPosting={createAndPost.isPending || updateAndPost.isPending}
        isSavingDraft={createDraft.isPending || updateDraft.isPending}
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
