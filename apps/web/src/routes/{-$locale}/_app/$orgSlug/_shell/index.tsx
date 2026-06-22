import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { DashboardPage } from "@/components/dashboard/dashboard-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}`,
        locale: params.locale
      },
      description: `View your account dashboard and protected application data in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Dashboard"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { user } = Route.useRouteContext();

  return <DashboardPage user={user} />;
}
