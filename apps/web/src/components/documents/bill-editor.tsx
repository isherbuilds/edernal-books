import { useState } from "react";
import { Controller, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { type PurchaseDocument } from "@tsu-stack/core/documents";

import { getTodayDateString, minorUnitsToDecimalString } from "@/utils/accounting-format";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import {
  useCreateAndPostPurchaseDocumentMutation,
  useCreatePurchaseDocumentDraftMutation,
  useUpdateAndPostPurchaseDocumentMutation,
  useUpdatePurchaseDocumentDraftMutation
} from "@/hooks/use-documents";
import { usePartiesQuery, useItemsQuery } from "@/hooks/use-records";
import { useZodForm } from "@/hooks/use-zod-form";

import {
  type PurchaseDocumentEditorFormValues,
  PURCHASE_KIND_OPTIONS,
  createEmptyLine,
  purchaseDocumentEditorSchema,
  toPurchaseLineInputs
} from "@/components/documents/document-editor-form";
import {
  DocumentEditorCard,
  DocumentEditorFooter,
  DocumentEditorLiveTotal,
  DocumentEditorSection
} from "@/components/documents/document-editor-frame";
import {
  type DocumentItemOption,
  DocumentLineItems
} from "@/components/documents/document-line-items";
import { FormComboboxField, FormSelectField, FormTextField } from "@/components/form-fields";

type BillEditorProps = {
  document: PurchaseDocument | null;
  onPosted: (documentId: string) => void;
  onSaved: (documentId: string) => void;
  orgSlug: string;
};

function toFormValues(document: PurchaseDocument | null): PurchaseDocumentEditorFormValues {
  if (!document) {
    return {
      documentDate: getTodayDateString(),
      documentKind: "purchase_bill",
      dueDate: "",
      lines: [createEmptyLine()],
      notes: "",
      partyId: "",
      reference: ""
    };
  }

  return {
    documentDate: document.purchaseDate,
    documentKind: document.documentKind,
    dueDate: document.dueDate ?? "",
    lines: document.lines.map((line) => {
      return {
        accountId: line.expenseAccountId,
        description: line.description,
        hsnCode: line.hsnCode ?? "",
        itemId: line.itemId ?? "",
        quantity: line.quantity,
        rate: minorUnitsToDecimalString(line.rateMinor),
        unit: line.unit ?? ""
      };
    }),
    notes: document.notes ?? "",
    partyId: document.vendorPartyId,
    reference: document.vendorReferenceNumber ?? ""
  };
}

export function BillEditor({ document, onPosted, onSaved, orgSlug }: BillEditorProps) {
  const [vendorSearch, setVendorSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const partiesQuery = usePartiesQuery({
    orgSlug,
    q: vendorSearch.trim() === "" ? undefined : vendorSearch
  });
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const itemsQuery = useItemsQuery({
    orgSlug,
    q: itemSearch.trim() === "" ? undefined : itemSearch,
    usage: "purchases"
  });

  const createDraft = useCreatePurchaseDocumentDraftMutation();
  const createAndPost = useCreateAndPostPurchaseDocumentMutation(orgSlug);
  const updateDraft = useUpdatePurchaseDocumentDraftMutation();
  const updateAndPost = useUpdateAndPostPurchaseDocumentMutation(orgSlug);

  const form = useZodForm(purchaseDocumentEditorSchema, { defaultValues: toFormValues(document) });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register
  } = form;

  const vendorOptions: Array<{ label: string; value: string }> = [];
  for (const page of partiesQuery.data?.pages ?? []) {
    for (const party of page.parties) {
      if (party.kind === "vendor" || party.kind === "both") {
        vendorOptions.push({ label: party.displayName, value: party.id });
      }
    }
  }

  const expenseAccountOptions = (accountsQuery.data?.accounts ?? []).reduce<
    Array<{ label: string; value: string }>
  >((options, account) => {
    if (
      account.accountCategory === "expense" &&
      account.active &&
      !account.isGroup &&
      account.allowManualPosting
    ) {
      options.push({ label: account.name, value: account.id });
    }

    return options;
  }, []);

  const itemOptions: DocumentItemOption[] = [];
  for (const page of itemsQuery.data?.pages ?? []) {
    for (const item of page.items) {
      itemOptions.push({
        accountId: item.expenseAccountId,
        description: item.description ?? item.name,
        hsnCode: item.hsnCode,
        label: item.name,
        rateMinor: item.purchaseRateMinor,
        unit: item.unit,
        value: item.id
      });
    }
  }

  const documentId = document?.id ?? null;

  const draftPayload = (values: PurchaseDocumentEditorFormValues) => {
    return {
      documentKind: values.documentKind,
      dueDate: values.dueDate === "" ? undefined : values.dueDate,
      lines: toPurchaseLineInputs(values.lines),
      notes: values.notes.trim() === "" ? null : values.notes.trim(),
      orgSlug,
      purchaseDate: values.documentDate,
      vendorPartyId: values.partyId,
      vendorReferenceNumber: values.reference.trim() === "" ? null : values.reference.trim()
    };
  };

  const persistDraft = (
    values: PurchaseDocumentEditorFormValues,
    onDone: (documentId: string) => void
  ) => {
    const payload = draftPayload(values);
    const onError = (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not save bill");

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

    if (!documentId) {
      createAndPost.mutate(payload, {
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Could not post bill"),
        onSuccess: (posted) => {
          toast.success("Bill posted");
          onPosted(posted.documentId);
        }
      });
      return;
    }

    updateAndPost.mutate(
      { documentId, ...payload },
      {
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Could not post bill"),
        onSuccess: (posted) => {
          toast.success("Bill posted");
          onPosted(posted.documentId);
        }
      }
    );
  });

  return (
    <FormProvider {...form}>
      <DocumentEditorCard noValidate onSubmit={onSaveDraft}>
        <DocumentEditorSection title="Vendor">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="partyId"
              render={({ field, fieldState }) => (
                <FormComboboxField
                  error={fieldState.error}
                  inputValue={vendorSearch}
                  items={vendorOptions}
                  label="Vendor"
                  loading={partiesQuery.isFetching}
                  manualFiltering
                  name={field.name}
                  onInputValueChange={setVendorSearch}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  placeholder="Select a vendor…"
                  value={field.value === "" ? null : field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="documentKind"
              render={({ field, fieldState }) => (
                <FormSelectField
                  error={fieldState.error}
                  label="Type"
                  name={field.name}
                  onBlur={field.onBlur}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  options={PURCHASE_KIND_OPTIONS}
                  value={field.value}
                />
              )}
            />
            <FormTextField
              error={errors.documentDate}
              label="Bill date"
              type="date"
              {...register("documentDate")}
            />
            <FormTextField
              error={errors.dueDate}
              label="Due date"
              type="date"
              {...register("dueDate")}
            />
          </div>
        </DocumentEditorSection>

        <DocumentEditorSection title="Line items">
          <DocumentLineItems
            accountLabel="Expense account"
            accountOptions={expenseAccountOptions}
            itemInputValue={itemSearch}
            itemOptions={itemOptions}
            itemOptionsLoading={itemsQuery.isFetching}
            onItemInputValueChange={setItemSearch}
            rateToInput={minorUnitsToDecimalString}
          />
          {errors.lines?.message ? (
            <p className="mt-2 text-sm text-destructive">{errors.lines.message}</p>
          ) : null}
        </DocumentEditorSection>

        <DocumentEditorSection title="Reference & notes">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              error={errors.reference}
              label="Vendor reference"
              {...register("reference")}
            />
            <FormTextField error={errors.notes} label="Notes" {...register("notes")} />
          </div>
        </DocumentEditorSection>

        <DocumentEditorFooter
          isPosting={createAndPost.isPending || updateAndPost.isPending}
          isSavingDraft={createDraft.isPending || updateDraft.isPending}
          onPost={onPost}
          onSaveDraft={onSaveDraft}
          postLabel="Post bill"
          summary={<DocumentEditorLiveTotal />}
        />
      </DocumentEditorCard>
    </FormProvider>
  );
}
