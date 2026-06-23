import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { signOutAndResetSession } from "@/lib/sign-out";

type UseSignOutOptions = {
  onSuccess?: () => Promise<void> | void;
};

export function useSignOutAndResetSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (options: UseSignOutOptions = {}) =>
    signOutAndResetSession({
      ...options,
      queryClient,
      router
    });
}
