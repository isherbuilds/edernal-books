import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useChartAccountsQuery(orgSlug: string, input?: { enabled?: boolean; q?: string }) {
  return useQuery({
    ...orpc.accounting.chart.list.queryOptions({
      input: {
        orgSlug,
        q: input?.q
      }
    }),
    enabled: input?.enabled ?? true
  });
}

export function usePostJournalEntryMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.accounting.journalEntries.post.mutationOptions({
      onSuccess: () => invalidateAccounting(queryClient, orgSlug)
    })
  );
}

export function useReverseJournalEntryMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.accounting.journalEntries.reverse.mutationOptions({
      onSuccess: () => invalidateAccounting(queryClient, orgSlug)
    })
  );
}

export function useGeneralLedgerInfiniteQuery(
  orgSlug: string,
  input: {
    accountId: string;
    fromDate?: string;
    toDate?: string;
  }
) {
  return useInfiniteQuery(
    orpc.accounting.reports.generalLedger.infiniteOptions({
      enabled: input.accountId.length > 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return {
          accountId: input.accountId,
          cursor,
          fromDate: input.fromDate,
          orgSlug,
          toDate: input.toDate
        };
      }
    })
  );
}

async function invalidateAccounting(queryClient: QueryClient, orgSlug: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.accounting.journalEntries.list.key({ input: { orgSlug } })
    }),
    queryClient.invalidateQueries({ queryKey: orpc.accounting.reports.key() })
  ]);
}
