import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { useDocumentNavigation } from "@/hooks/use-document-navigation";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { SettlementForm } from "@/components/documents/settlement-form";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/purchase/payments/new")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/purchase/payments/new`,
        locale: params.locale
      },
      description: "Record a vendor payment.",
      robots: { follow: false, index: false },
      title: "New payment"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const documentNavigation = useDocumentNavigation(orgSlug);

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  const goToDocument = (documentId: string) => documentNavigation.purchasePayment(documentId);

  return (
    <PageLayout>
      <PageHeader
        description="Record money paid and allocate it to open bills."
        title="New payment"
      />
      <SettlementForm
        direction="paid"
        document={null}
        onPosted={goToDocument}
        onSaved={goToDocument}
        orgSlug={orgSlug}
      />
    </PageLayout>
  );
}
