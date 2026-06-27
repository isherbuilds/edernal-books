import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { ChartOfAccountsPage } from "@/components/accounting/chart-of-accounts-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/settings/chart-of-accounts")(
  {
    head: ({ params }) =>
      generateAppSeo({
        alternates: {
          canonicalPath: `/${params.orgSlug}/settings/chart-of-accounts`,
          locale: params.locale
        },
        description: "View the ledger chart of accounts.",
        robots: {
          follow: false,
          index: false
        },
        title: "Chart of Accounts"
      }),
    component: RouteComponent
  }
);

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <ChartOfAccountsPage orgSlug={orgSlug} />;
}
