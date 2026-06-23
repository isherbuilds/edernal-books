import { Outlet, createFileRoute } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";

import { getRedirectTo } from "@/lib/redirect-to";

import { getOrganizationsListQueryOptions } from "@/hooks/use-organizations";

export const Route = createFileRoute("/{-$locale}/_app")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    const currentPath = stripLocalePrefix(location.pathname);

    if (!user) {
      throw redirect({
        search: {
          redirect: getRedirectTo(location.href)
        },
        to: "/login"
      });
    }

    const organizations = await context.queryClient.ensureQueryData({
      ...getOrganizationsListQueryOptions(),
      revalidateIfStale: true
    });

    if (organizations.length === 0 && currentPath !== "/organizations/new") {
      throw redirect({
        to: "/organizations/new"
      });
    }

    return { organizations, user };
  },

  component: Outlet
});
