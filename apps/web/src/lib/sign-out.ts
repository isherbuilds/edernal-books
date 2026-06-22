import { type QueryClient } from "@tanstack/react-query";
import { type AnyRouter } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";

type SignOutAndResetOptions = {
  queryClient: QueryClient;
  router: AnyRouter;
  onSuccess?: () => Promise<void> | void;
};

export async function signOutAndResetSession({
  onSuccess,
  queryClient,
  router
}: SignOutAndResetOptions) {
  const result = await authClient.signOut();

  if (result.error) {
    throw new Error(result.error.message ?? "Failed to sign out");
  }

  queryClient.clear();
  await router.invalidate();
  await onSuccess?.();
}
