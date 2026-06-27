import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { ItemsPage } from "@/components/owner-records/items-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/records/items")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/records/items`,
        locale: params.locale
      },
      description: "Manage goods and services.",
      robots: {
        follow: false,
        index: false
      },
      title: "Items"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <ItemsPage orgSlug={orgSlug} />;
}
