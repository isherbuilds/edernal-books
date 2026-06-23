import { Outlet, createFileRoute } from "@tanstack/react-router";

import { $getUser } from "@tsu-stack/auth/react/tanstack-start/functions";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

import { getRedirectTo } from "@/lib/redirect-to";

export const Route = createFileRoute("/{-$locale}/_app")({
  beforeLoad: async ({ location }) => {
    const user = await $getUser();

    if (!user) {
      throw redirect({
        search: {
          redirect: getRedirectTo(location.href)
        },
        to: "/login"
      });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  return <Outlet />;
}
