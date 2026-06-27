import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { PartiesPage } from "@/components/owner-records/parties-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/records/parties")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/records/parties`,
        locale: params.locale
      },
      description: "Manage customers and vendors.",
      robots: {
        follow: false,
        index: false
      },
      title: "Parties"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <PartiesPage orgSlug={orgSlug} />;
}
