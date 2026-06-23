import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { authClient } from "@tsu-stack/auth/react/auth-client";

import { businessSettingsQueryKeys } from "@/hooks/use-business-settings";
import { queryTtl } from "@/lib/query-ttl";

export const organizationsQueryKeys = {
  list() {
    return ["organizations", "list"] as const;
  }
};


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
    orpc.organizations.settings.upsert.mutationOptions({
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
