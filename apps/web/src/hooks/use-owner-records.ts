import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type CreateItemInput,
  type ListItemsInput,
  type SetItemActiveInput
} from "@tsu-stack/core/items";
import {
  type CreatePartyInput,
  type ListPartiesInput,
  type SetPartyActiveInput
} from "@tsu-stack/core/parties";

export function usePartiesQuery(input: ListPartiesInput) {
  return useQuery(orpc.parties.list.queryOptions({ input }));
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

export function useItemsQuery(input: ListItemsInput) {
  return useQuery(orpc.items.list.queryOptions({ input }));
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
export type SetPartyActiveMutationInput = SetPartyActiveInput;
export type CreateItemMutationInput = CreateItemInput;
export type SetItemActiveMutationInput = SetItemActiveInput;
