import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type GetItemInput, type ListItemsInput } from "@tsu-stack/core/items";
import { type GetPartyInput, type ListPartiesInput } from "@tsu-stack/core/parties";

type PartiesQueryInput = Omit<ListPartiesInput, "cursor" | "limit"> & {
  limit?: ListPartiesInput["limit"];
};

type ItemsQueryInput = Omit<ListItemsInput, "cursor" | "limit"> & {
  limit?: ListItemsInput["limit"];
};

export function usePartiesQuery(input: PartiesQueryInput) {
  return useInfiniteQuery(
    orpc.parties.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return {
          ...input,
          cursor
        };
      }
    })
  );
}

export function usePartyQuery(input: GetPartyInput, enabled: boolean) {
  return useQuery({
    ...orpc.parties.get.queryOptions({
      input
    }),
    enabled
  });
}

export function useCreatePartyMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.parties.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.parties.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.parties.get.key() });
      }
    })
  );
}

export function useUpdatePartyMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.parties.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.parties.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.parties.get.key() });
      }
    })
  );
}

export function useSetPartyActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.parties.setActive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.parties.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.parties.get.key() });
      }
    })
  );
}

export function useItemsQuery(input: ItemsQueryInput) {
  return useInfiniteQuery(
    orpc.items.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      input: (cursor) => {
        return {
          ...input,
          cursor
        };
      }
    })
  );
}

export function useItemQuery(input: GetItemInput, enabled: boolean) {
  return useQuery({
    ...orpc.items.get.queryOptions({
      input
    }),
    enabled
  });
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.items.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.items.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.items.get.key() });
      }
    })
  );
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.items.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.items.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.items.get.key() });
      }
    })
  );
}

export function useSetItemActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.items.setActive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.items.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.items.get.key() });
      }
    })
  );
}
