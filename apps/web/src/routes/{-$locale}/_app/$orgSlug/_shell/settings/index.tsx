import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { SettingsPage } from "@/components/settings/settings-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/settings/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/settings`,
        locale: params.locale
      },
      description: "Configure your business profile, accounting periods, and chart of accounts.",
      robots: {
        follow: false,
        index: false
      },
      title: "Settings"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <SettingsPage orgSlug={orgSlug} />;
}
