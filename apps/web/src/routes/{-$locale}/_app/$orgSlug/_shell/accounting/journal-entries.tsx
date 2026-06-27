import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { JournalEntriesPage } from "@/components/accounting/journal-entries-page";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/accounting/journal-entries")(
  {
    head: ({ params }) =>
      generateAppSeo({
        alternates: {
          canonicalPath: `/${params.orgSlug}/accounting/journal-entries`,
          locale: params.locale
        },
        description: "Post and reverse manual journal entries.",
        robots: {
          follow: false,
          index: false
        },
        title: "Journal Entries"
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

  return <JournalEntriesPage orgSlug={orgSlug} />;
}
