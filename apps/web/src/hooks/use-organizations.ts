import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { queryTtl } from "@/lib/query-ttl";

import { businessSettingsQueryKeys } from "@/hooks/use-business-settings";

export const organizationsQueryKeys = {
  list() {
    return ["organizations", "list"] as const;
  }
};

export function getOrganizationsListQueryOptions() {
  return queryOptions({
    gcTime: queryTtl.organizationListGc,
    queryKey: organizationsQueryKeys.list(),
    queryFn: () => orpc.organizations.list.call(),
    staleTime: queryTtl.organizationListStale
  });
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
