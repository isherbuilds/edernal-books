import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { BillEditor } from "@/components/documents/bill-editor";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/purchase/bills/new")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/purchase/bills/new`, locale: params.locale },
      description: "Create a vendor bill or expense.",
      robots: { follow: false, index: false },
      title: "New bill"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  const goToDocument = (documentId: string) =>
    navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/purchase/bills/$documentId" });

  return (
    <PageLayout>
      <PageHeader
        description="Draft a vendor bill or expense, then post it to the ledger."
        title="New bill"
      />
      <BillEditor
        document={null}
        onPosted={goToDocument}
        onSaved={goToDocument}
        orgSlug={orgSlug}
      />
    </PageLayout>
  );
}
