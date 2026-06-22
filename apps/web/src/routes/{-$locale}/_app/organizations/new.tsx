import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/lib/seo";

import { OrganizationSetupPage } from "@/components/organizations/organization-setup-page";

export const Route = createFileRoute("/{-$locale}/_app/organizations/new")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/organizations/new",
        locale: params.locale
      },
      description: "Create or join a business workspace for Edernal Books.",
      robots: {
        follow: false,
        index: false
      },
      title: "Organization Setup"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { user } = Route.useRouteContext();

  return <OrganizationSetupPage user={user} />;
}
