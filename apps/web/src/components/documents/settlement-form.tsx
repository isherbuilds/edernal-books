import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  type AllocationTarget,
  PAYMENT_MODES,
  type SettlementDirection,
  type SettlementDocument
} from "@tsu-stack/core/documents";

import {
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

import { SettlementFormBody } from "@/components/documents/settlement-form-body";
import {
  type AllocationTargetInfo,
  type SettlementFormOption,
  type SettlementFormValues
} from "@/components/documents/settlement-form-types";

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

type AllocationPayloadItem = {
  amountMinor: string;
  targetDocumentId: string;
  targetDocumentKind: AllocationTarget["documentKind"];
};

function sumAvailableAllocationsMinor(
  allocations: Record<string, string>,
  allocationTargetsById: Map<string, AllocationTargetInfo>
) {
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
}

function sumAllocationPayloadMinor(allocationPayload: AllocationPayloadItem[]) {
  let sum = 0n;

  for (const allocation of allocationPayload) {
    sum += BigInt(allocation.amountMinor);
  }

  return sum;
}

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

  const partyOptions: SettlementFormOption[] = [];
  const matchesDirection =
    direction === "received"
      ? (kind: string) => kind === "customer" || kind === "both"
      : (kind: string) => kind === "vendor" || kind === "both";
  for (const page of partiesQuery.data?.pages ?? []) {
    for (const party of page.parties) {
      if (matchesDirection(party.kind)) {
        partyOptions.push({ label: party.displayName, value: party.id });
      }
    }
  }

  const cashAccountOptions: SettlementFormOption[] = [];
  for (const account of accountsQuery.data?.accounts ?? []) {
    if (
      account.accountCategory === "asset" &&
      (account.accountType === "cash" || account.accountType === "bank") &&
      account.active &&
      !account.isGroup &&
      account.allowManualPosting
    ) {
      cashAccountOptions.push({ label: account.name, value: account.id });
    }
  }

  const amount = watch("amount");
  const partyId = watch("partyId");

  const allocationTargetsQuery = useAllocationTargetsQuery(
    { direction, orgSlug, partyId },
    partyId !== ""
  );
  const targets: AllocationTarget[] = [];
  for (const page of allocationTargetsQuery.data?.pages ?? []) {
    targets.push(...page.targets);
  }
  const displayedTargetEntries = new Map<string, AllocationTargetInfo>();

  for (const allocation of document?.allocations ?? []) {
    displayedTargetEntries.set(allocation.targetDocumentId, {
      documentKind: allocation.targetDocumentKind,
      documentNumber: allocation.targetDocumentNumber ?? undefined,
      unavailable: true
    });
  }

  for (const target of targets) {
    displayedTargetEntries.set(target.id, {
      documentKind: target.documentKind,
      documentDate: target.documentDate,
      documentNumber: target.documentNumber,
      outstandingMinor: target.outstandingMinor,
      unavailable: false
    });
  }

  const displayedTargets = Array.from(displayedTargetEntries, ([id, target]) => {
    return { id, ...target };
  });
  const allocationTargetsById = new Map(displayedTargets.map((target) => [target.id, target]));
  const parsedAmount = parseDecimalAmountToMinorUnits(amount);
  const amountMinor = parsedAmount.ok ? parsedAmount.value : null;
  const allocatedMinor = sumAvailableAllocationsMinor(allocations, allocationTargetsById);

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

    const allocationPayload: AllocationPayloadItem[] = [];

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

    const allocatedTotal = sumAllocationPayloadMinor(allocationPayload);
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
    <SettlementFormBody
      allocatedMinor={allocatedMinor}
      allocationPagination={{
        hasNextPage: allocationTargetsQuery.hasNextPage,
        loadingNextPage: allocationTargetsQuery.isFetchingNextPage,
        onLoadMore: () => {
          void allocationTargetsQuery.fetchNextPage();
        }
      }}
      allocations={allocations}
      amountMinor={amountMinor}
      cashAccountOptions={cashAccountOptions}
      control={control}
      displayedTargets={displayedTargets}
      errors={errors}
      onAllocationChange={setAllocation}
      onPartyChanged={() => setAllocations({})}
      onPost={onPost}
      onSaveDraft={onSaveDraft}
      partyLabel={partyLabel}
      partyLoading={partiesQuery.isFetching}
      partyOptions={partyOptions}
      partyPlaceholder={partyPlaceholder}
      partySearch={partySearch}
      paymentModeOptions={paymentModeOptions}
      postLabel={postLabel}
      register={register}
      setPartySearch={setPartySearch}
      showAllocationPanel={showAllocationPanel}
      saving={{
        posting: createAndPost.isPending || updateAndPost.isPending,
        savingDraft: createDraft.isPending || updateDraft.isPending
      }}
    />
  );
}
