import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { canManageBusinessSettings } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { BusinessSettingsPage } from "@/components/settings/business-settings-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/settings/business")({
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      orpc.organizations.settings.get.queryOptions({
        input: {
          orgSlug: params.orgSlug
        }
      })
    );
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/settings/business`,
        locale: params.locale
      },
      description: "Manage legal, fiscal, currency, and contact settings for the business.",
      robots: {
        follow: false,
        index: false
      },
      title: "Business Settings"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  return (
    <BusinessSettingsPage
      canManageSettings={canManageBusinessSettings(organization.role)}
      orgSlug={orgSlug}
    />
  );
}
