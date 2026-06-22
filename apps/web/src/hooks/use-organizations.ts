import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { queryTtl } from "@/lib/query-ttl";

import { businessSettingsQueryKeys } from "./use-business-settings";

export const organizationsQueryKeys = {
  list() {
    return orpc.organizations.list.key();
  }
};

export function getOrganizationsListQueryOptions() {
  return {
    ...orpc.organizations.list.queryOptions(),
    gcTime: queryTtl.organizationListGc,
    staleTime: queryTtl.organizationListStale
  };
}

type UseCompleteOnboardingMutationOptions = {
  onError?: (error: unknown) => void;
  onSuccess?: () => Promise<void> | void;
};

export function useCompleteOnboardingMutation(
  orgSlug: string,
  options: UseCompleteOnboardingMutationOptions = {}
) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.organizations.completeOnboarding.mutationOptions({
      onError: options.onError,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: organizationsQueryKeys.list()
          }),
          queryClient.invalidateQueries({
            queryKey: businessSettingsQueryKeys.detail(orgSlug)
          })
        ]);
        await options.onSuccess?.();
      }
    })
  );
}
