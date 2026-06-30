import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type GetPurchaseDocumentInput,
  type GetSalesDocumentInput,
  type GetSettlementInput,
  type ListAllocationTargetsInput,
  type ListPurchaseDocumentsInput,
  type ListSalesDocumentsInput,
  type ListSettlementsInput,
  type DocumentKind,
  type DocumentStatus
} from "@tsu-stack/core/documents";

type SalesInvoicesQueryInput = Omit<ListSalesDocumentsInput, "cursor" | "limit"> & {
  limit?: ListSalesDocumentsInput["limit"];
};
type PurchaseDocumentsQueryInput = Omit<ListPurchaseDocumentsInput, "cursor" | "limit"> & {
  limit?: ListPurchaseDocumentsInput["limit"];
};
type SettlementsQueryInput = Omit<ListSettlementsInput, "cursor" | "limit"> & {
  limit?: ListSettlementsInput["limit"];
};
type AllocationTargetsQueryInput = Omit<ListAllocationTargetsInput, "cursor" | "limit"> & {
  limit?: ListAllocationTargetsInput["limit"];
};

const DOCUMENT_REGISTER_STALE_MS = 30_000;

export function useSalesInvoicesQuery(input: SalesInvoicesQueryInput) {
  return useInfiniteQuery(getSalesInvoicesInfiniteQueryOptions(input));
}

export function usePurchaseDocumentsQuery(input: PurchaseDocumentsQueryInput) {
  return useInfiniteQuery(getPurchaseDocumentsInfiniteQueryOptions(input));
}

export function useSettlementsQuery(input: SettlementsQueryInput) {
  return useInfiniteQuery(getSettlementsInfiniteQueryOptions(input));
}

export function getSalesInvoicesInfiniteQueryOptions(input: SalesInvoicesQueryInput) {
  return {
    ...orpc.salesDocuments.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return { ...input, cursor };
      }
    }),
    staleTime: DOCUMENT_REGISTER_STALE_MS
  };
}

export function getPurchaseDocumentsInfiniteQueryOptions(input: PurchaseDocumentsQueryInput) {
  return {
    ...orpc.purchaseDocuments.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return { ...input, cursor };
      }
    }),
    staleTime: DOCUMENT_REGISTER_STALE_MS
  };
}

export function getSettlementsInfiniteQueryOptions(input: SettlementsQueryInput) {
  return {
    ...orpc.settlements.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return { ...input, cursor };
      }
    }),
    staleTime: DOCUMENT_REGISTER_STALE_MS
  };
}

export function useSalesDocumentQuery(input: GetSalesDocumentInput, enabled: boolean) {
  return useQuery({
    ...orpc.salesDocuments.get.queryOptions({ input }),
    enabled,
    staleTime: DOCUMENT_REGISTER_STALE_MS
  });
}

export function usePurchaseDocumentQuery(input: GetPurchaseDocumentInput, enabled: boolean) {
  return useQuery({
    ...orpc.purchaseDocuments.get.queryOptions({ input }),
    enabled,
    staleTime: DOCUMENT_REGISTER_STALE_MS
  });
}

export function useSettlementQuery(input: GetSettlementInput, enabled: boolean) {
  return useQuery({
    ...orpc.settlements.get.queryOptions({ input }),
    enabled,
    staleTime: DOCUMENT_REGISTER_STALE_MS
  });
}

export function useAllocationTargetsQuery(input: AllocationTargetsQueryInput, enabled: boolean) {
  return useInfiniteQuery({
    ...orpc.settlements.listAllocationTargets.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return { ...input, cursor };
      }
    }),
    enabled,
    staleTime: DOCUMENT_REGISTER_STALE_MS
  });
}

export function useCreateSalesInvoiceDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.salesDocuments.createDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, salesDocumentReadKeys())
    })
  );
}

export function useCreateAndPostSalesInvoiceMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.salesDocuments.createAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedSalesDocumentKeys(orgSlug))
    })
  );
}

export function useUpdateSalesInvoiceDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.salesDocuments.updateDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, salesDocumentReadKeys())
    })
  );
}

export function useUpdateAndPostSalesInvoiceMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.salesDocuments.updateAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedSalesDocumentKeys(orgSlug))
    })
  );
}

export function useCreatePurchaseDocumentDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.purchaseDocuments.createDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, purchaseDocumentReadKeys())
    })
  );
}

export function useCreateAndPostPurchaseDocumentMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.purchaseDocuments.createAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedPurchaseDocumentKeys(orgSlug))
    })
  );
}

export function useUpdatePurchaseDocumentDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.purchaseDocuments.updateDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, purchaseDocumentReadKeys())
    })
  );
}

export function useUpdateAndPostPurchaseDocumentMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.purchaseDocuments.updateAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedPurchaseDocumentKeys(orgSlug))
    })
  );
}

export function useCreateSettlementDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.settlements.createDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, settlementReadKeys())
    })
  );
}

export function useCreateAndPostSettlementMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.settlements.createAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedSettlementKeys(orgSlug))
    })
  );
}

export function useUpdateSettlementDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.settlements.updateDraft.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, settlementReadKeys())
    })
  );
}

export function useUpdateAndPostSettlementMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.settlements.updateAndPost.mutationOptions({
      onSuccess: () => invalidateQueries(queryClient, postedSettlementKeys(orgSlug))
    })
  );
}

export function useVoidDocumentMutation(orgSlug: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidateQueries(queryClient, voidedDocumentKeys(orgSlug));
  const salesMutation = useMutation(orpc.salesDocuments.void.mutationOptions({ onSuccess }));
  const purchaseMutation = useMutation(orpc.purchaseDocuments.void.mutationOptions({ onSuccess }));
  const settlementMutation = useMutation(orpc.settlements.void.mutationOptions({ onSuccess }));

  return {
    isPending:
      salesMutation.isPending || purchaseMutation.isPending || settlementMutation.isPending,
    mutate(input: VoidDocumentMutationInput, options?: VoidDocumentMutationOptions) {
      const mutationOptions = {
        onError: options?.onError,
        onSuccess: options?.onSuccess
      };
      const voidInput = {
        documentId: input.documentId,
        orgSlug: input.orgSlug,
        reason: input.reason,
        voidDate: input.voidDate
      };

      if (input.documentKind === "sales_invoice") {
        salesMutation.mutate(voidInput, mutationOptions);
        return;
      }

      if (input.documentKind === "settlement") {
        settlementMutation.mutate(voidInput, mutationOptions);
        return;
      }

      purchaseMutation.mutate({ ...voidInput, documentKind: input.documentKind }, mutationOptions);
    }
  };
}

type VoidDocumentMutationInput = {
  documentId: string;
  documentKind: DocumentKind;
  orgSlug: string;
  reason: string;
  voidDate: string;
};

type VoidDocumentMutationOptions = {
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
};

export function documentKindLabel(kind: DocumentKind): string {
  switch (kind) {
    case "sales_invoice":
      return "Invoice";
    case "purchase_bill":
      return "Bill";
    case "expense":
      return "Expense";
    case "settlement":
      return "Settlement";
  }
}

export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "posted":
      return "Posted";
    case "voided":
      return "Voided";
  }
}

type QueryKey = readonly unknown[];

async function invalidateQueries(queryClient: QueryClient, keys: QueryKey[]) {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function salesDocumentReadKeys(): QueryKey[] {
  return [orpc.salesDocuments.list.key(), orpc.salesDocuments.get.key()];
}

function purchaseDocumentReadKeys(): QueryKey[] {
  return [orpc.purchaseDocuments.list.key(), orpc.purchaseDocuments.get.key()];
}

function settlementReadKeys(): QueryKey[] {
  return [orpc.settlements.list.key(), orpc.settlements.get.key()];
}

function allocationTargetKeys(): QueryKey[] {
  return [orpc.settlements.listAllocationTargets.key()];
}

function accountingKeys(orgSlug: string): QueryKey[] {
  return [
    orpc.accounting.journalEntries.list.key({ input: { orgSlug } }),
    orpc.accounting.reports.key()
  ];
}

function postedSalesDocumentKeys(orgSlug: string): QueryKey[] {
  return [...salesDocumentReadKeys(), ...allocationTargetKeys(), ...accountingKeys(orgSlug)];
}

function postedPurchaseDocumentKeys(orgSlug: string): QueryKey[] {
  return [...purchaseDocumentReadKeys(), ...allocationTargetKeys(), ...accountingKeys(orgSlug)];
}

function postedSettlementKeys(orgSlug: string): QueryKey[] {
  return [...allDocumentReadKeys(), ...allocationTargetKeys(), ...accountingKeys(orgSlug)];
}

function voidedDocumentKeys(orgSlug: string): QueryKey[] {
  return [...allDocumentReadKeys(), ...allocationTargetKeys(), ...accountingKeys(orgSlug)];
}

function allDocumentReadKeys(): QueryKey[] {
  return [...salesDocumentReadKeys(), ...purchaseDocumentReadKeys(), ...settlementReadKeys()];
}
