import { Outlet, createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

import { getRedirectTo } from "@/lib/redirect-to";

import { CenteredLayout } from "@/components/app-shell/centered-layout";

const guestSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined).transform(getRedirectTo)
});

export const Route = createFileRoute("/{-$locale}/_guest")({
  validateSearch: zodValidator(guestSearchSchema),
  component: GuestLayout,
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.ensureQueryData({
      ...getAuthUserQueryOptions(),
      revalidateIfStale: true
    });

    const redirectTo = search.redirect;

    if (user) {
      throw redirect({
        to: redirectTo
      });
    }

    return {
      // We pass this as context so login/signup can redirect after successful authentication.
      redirectTo
    };
  }
});

function GuestLayout() {
  return (
    <CenteredLayout>
      <Outlet />
    </CenteredLayout>
  );
}
