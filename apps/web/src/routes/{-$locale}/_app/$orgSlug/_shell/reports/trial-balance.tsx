import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { TrialBalancePage } from "@/components/accounting/trial-balance-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/reports/trial-balance")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/reports/trial-balance`,
        locale: params.locale
      },
      description: "Run a trial balance report.",
      robots: {
        follow: false,
        index: false
      },
      title: "Trial Balance"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <TrialBalancePage orgSlug={orgSlug} />;
}
