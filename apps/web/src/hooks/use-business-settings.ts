import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { queryTtl } from "@/lib/query-ttl";

export const businessSettingsQueryKeys = {
  detail(orgSlug: string) {
    return orpc.organizations.settings.get.key({
      input: {
        orgSlug
      }
    });
  }
};

export function useBusinessSettingsQuery(orgSlug: string) {
  return useQuery({
    ...orpc.organizations.settings.get.queryOptions({
      input: {
        orgSlug
      }
    }),
    gcTime: queryTtl.settingsGc,
    staleTime: queryTtl.settingsStale
  });
}

type UseUpsertBusinessSettingsMutationOptions = {
  onError?: (error: unknown) => void;
  onSuccess?: () => Promise<void> | void;
};

export function useUpsertBusinessSettingsMutation(
  orgSlug: string,
  options: UseUpsertBusinessSettingsMutationOptions = {}
) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.organizations.settings.upsert.mutationOptions({
      onError: options.onError,
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: businessSettingsQueryKeys.detail(orgSlug)
        });
        await options.onSuccess?.();
      }
    })
  );
}
