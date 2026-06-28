import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type CreateItemInput,
  type ListItemsInput,
  type SetItemActiveInput,
  type UpdateItemInput
} from "@tsu-stack/core/items";
import {
  type CreatePartyInput,
  type ListPartiesInput,
  type SetPartyActiveInput,
  type UpdatePartyInput
} from "@tsu-stack/core/parties";

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

export function useCreatePartyMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.parties.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.parties.list.key() });
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

export function useCreateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.items.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.items.list.key() });
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
      }
    })
  );
}

export type CreatePartyMutationInput = CreatePartyInput;
export type UpdatePartyMutationInput = UpdatePartyInput;
export type SetPartyActiveMutationInput = SetPartyActiveInput;
export type CreateItemMutationInput = CreateItemInput;
export type UpdateItemMutationInput = UpdateItemInput;
export type SetItemActiveMutationInput = SetItemActiveInput;
