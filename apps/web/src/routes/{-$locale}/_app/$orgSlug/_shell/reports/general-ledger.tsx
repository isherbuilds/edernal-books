import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { GeneralLedgerPage } from "@/components/accounting/general-ledger-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/reports/general-ledger")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/reports/general-ledger`,
        locale: params.locale
      },
      description: "Run a general ledger report.",
      robots: {
        follow: false,
        index: false
      },
      title: "General Ledger"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <GeneralLedgerPage orgSlug={orgSlug} />;
}
