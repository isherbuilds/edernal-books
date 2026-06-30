import { QueryClient, environmentManager } from "@tanstack/react-query";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 2 minutes so that the client doesn't refetch when it hydrates from the SSR queryClient
        // See: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#initial-setup
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          if (
            error instanceof Error &&
            "status" in error &&
            [401, 403].includes((error as { status: number }).status)
          ) {
            return false;
          }
          return failureCount < 2;
        },
        staleTime: 1000 * 60 * 2
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    return createQueryClient();
  }

  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
