import { useMemo, useState } from "react";
import { Controller, FormProvider, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { type SalesDocument } from "@tsu-stack/core/documents";

import { getTodayDateString, minorUnitsToDecimalString } from "@/utils/accounting-format";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import {
  useCreateAndPostSalesInvoiceMutation,
  useCreateSalesInvoiceDraftMutation,
  useUpdateAndPostSalesInvoiceMutation,
  useUpdateSalesInvoiceDraftMutation
} from "@/hooks/use-documents";
import { usePartiesQuery, useItemsQuery } from "@/hooks/use-records";
import { useZodForm } from "@/hooks/use-zod-form";

import {
  type SalesInvoiceEditorFormValues,
  createEmptyLine,
  salesInvoiceEditorSchema,
  toSalesLineInputs
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
import { FormComboboxField, FormTextField } from "@/components/form-fields";

type InvoiceEditorProps = {
  document: SalesDocument | null;
  onPosted: (documentId: string) => void;
  onSaved: (documentId: string) => void;
  orgSlug: string;
};

function toFormValues(document: SalesDocument | null): SalesInvoiceEditorFormValues {
  if (!document) {
    return {
      documentDate: getTodayDateString(),
      dueDate: "",
      lines: [createEmptyLine()],
      notes: "",
      partyId: "",
      terms: ""
    };
  }

  return {
    documentDate: document.invoiceDate,
    dueDate: document.dueDate ?? "",
    lines: document.lines.map((line) => {
      return {
        accountId: line.incomeAccountId,
        description: line.description,
        hsnCode: line.hsnCode ?? "",
        itemId: line.itemId ?? "",
        quantity: line.quantity,
        rate: minorUnitsToDecimalString(line.rateMinor),
        unit: line.unit ?? ""
      };
    }),
    notes: document.notes ?? "",
    partyId: document.customerPartyId,
    terms: document.terms ?? ""
  };
}

export function InvoiceEditor({ document, onPosted, onSaved, orgSlug }: InvoiceEditorProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const partiesQuery = usePartiesQuery({
    orgSlug,
    q: customerSearch.trim() === "" ? undefined : customerSearch
  });
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const itemsQuery = useItemsQuery({
    orgSlug,
    q: itemSearch.trim() === "" ? undefined : itemSearch,
    usage: "sales"
  });

  const createDraft = useCreateSalesInvoiceDraftMutation();
  const createAndPost = useCreateAndPostSalesInvoiceMutation(orgSlug);
  const updateDraft = useUpdateSalesInvoiceDraftMutation();
  const updateAndPost = useUpdateAndPostSalesInvoiceMutation(orgSlug);

  const form = useZodForm(salesInvoiceEditorSchema, { defaultValues: toFormValues(document) });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register
  } = form;

  const customerOptions = useMemo(() => {
    const parties = partiesQuery.data?.pages.flatMap((page) => page.parties) ?? [];
    return parties
      .filter((party) => party.kind === "customer" || party.kind === "both")
      .map((party) => {
        return { label: party.displayName, value: party.id };
      });
  }, [partiesQuery.data]);

  const incomeAccountOptions = useMemo(() => {
    const accounts = accountsQuery.data?.accounts ?? [];
    return accounts
      .filter(
        (account) =>
          account.accountCategory === "income" &&
          account.active &&
          !account.isGroup &&
          account.allowManualPosting
      )
      .map((account) => {
        return { label: account.name, value: account.id };
      });
  }, [accountsQuery.data]);

  const itemOptions = useMemo<DocumentItemOption[]>(() => {
    const items = itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return items.map((item) => {
      return {
        accountId: item.salesAccountId,
        description: item.description ?? item.name,
        hsnCode: item.hsnCode,
        label: item.name,
        rateMinor: item.salesRateMinor,
        unit: item.unit,
        value: item.id
      };
    });
  }, [itemsQuery.data]);

  const partyId = useWatch({ control, name: "partyId" });
  const selectedCustomer = useMemo(() => {
    const parties = partiesQuery.data?.pages.flatMap((page) => page.parties) ?? [];
    return parties.find((party) => party.id === partyId) ?? null;
  }, [partiesQuery.data, partyId]);

  const documentId = document?.id ?? null;

  const draftPayload = (values: SalesInvoiceEditorFormValues) => {
    return {
      customerPartyId: values.partyId,
      dueDate: values.dueDate === "" ? undefined : values.dueDate,
      invoiceDate: values.documentDate,
      lines: toSalesLineInputs(values.lines),
      notes: values.notes.trim() === "" ? null : values.notes.trim(),
      orgSlug,
      terms: values.terms.trim() === "" ? null : values.terms.trim()
    };
  };

  const persistDraft = (
    values: SalesInvoiceEditorFormValues,
    onDone: (documentId: string) => void
  ) => {
    const payload = draftPayload(values);
    const onError = (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not save invoice");

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
          toast.error(error instanceof Error ? error.message : "Could not post invoice"),
        onSuccess: (posted) => {
          toast.success("Invoice posted");
          onPosted(posted.documentId);
        }
      });
      return;
    }

    updateAndPost.mutate(
      { documentId, ...payload },
      {
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Could not post invoice"),
        onSuccess: (posted) => {
          toast.success("Invoice posted");
          onPosted(posted.documentId);
        }
      }
    );
  });

  return (
    <FormProvider {...form}>
      <DocumentEditorCard noValidate onSubmit={onSaveDraft}>
        <DocumentEditorSection title="Customer">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="partyId"
                render={({ field, fieldState }) => (
                  <FormComboboxField
                    error={fieldState.error}
                    inputValue={customerSearch}
                    items={customerOptions}
                    label="Customer"
                    loading={partiesQuery.isFetching}
                    manualFiltering
                    name={field.name}
                    onInputValueChange={setCustomerSearch}
                    onValueChange={(value) => field.onChange(value ?? "")}
                    placeholder="Select a customer…"
                    value={field.value === "" ? null : field.value}
                  />
                )}
              />
              {selectedCustomer && (selectedCustomer.gstin || selectedCustomer.state) ? (
                <p className="text-xs text-muted-foreground">
                  {[
                    selectedCustomer.gstin ? `GSTIN ${selectedCustomer.gstin}` : null,
                    selectedCustomer.state
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="hidden sm:block" />
            <FormTextField
              error={errors.documentDate}
              label="Invoice date"
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
            accountLabel="Income account"
            accountOptions={incomeAccountOptions}
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

        <DocumentEditorSection title="Terms & notes">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField error={errors.terms} label="Terms" {...register("terms")} />
            <FormTextField error={errors.notes} label="Notes" {...register("notes")} />
          </div>
        </DocumentEditorSection>

        <DocumentEditorFooter
          isPosting={createAndPost.isPending || updateAndPost.isPending}
          isSavingDraft={createDraft.isPending || updateDraft.isPending}
          onPost={onPost}
          onSaveDraft={onSaveDraft}
          postLabel="Post invoice"
          summary={<DocumentEditorLiveTotal />}
        />
      </DocumentEditorCard>
    </FormProvider>
  );
}
