import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { AccountingPeriodsPage } from "@/components/accounting/accounting-periods-page";

export const Route = createFileRoute(
  "/{-$locale}/_app/$orgSlug/_shell/settings/accounting-periods"
)({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/settings/accounting-periods`,
        locale: params.locale
      },
      description: "View fiscal accounting periods.",
      robots: {
        follow: false,
        index: false
      },
      title: "Accounting Periods"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <AccountingPeriodsPage orgSlug={orgSlug} />;
}
