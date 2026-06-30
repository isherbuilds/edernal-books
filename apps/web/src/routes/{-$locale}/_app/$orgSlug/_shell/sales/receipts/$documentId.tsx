import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { generateAppSeo } from "@/lib/seo";

import { useDocumentNavigation } from "@/hooks/use-document-navigation";
import { useSettlementQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentDetail } from "@/components/documents/document-detail";
import { SettlementForm } from "@/components/documents/settlement-form";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/receipts/$documentId")(
  {
    head: ({ params }) =>
      generateAppSeo({
        alternates: {
          canonicalPath: `/${params.orgSlug}/sales/receipts/${params.documentId}`,
          locale: params.locale
        },
        description: "View or edit a customer receipt.",
        robots: { follow: false, index: false },
        title: "Receipt"
      }),
    component: RouteComponent
  }
);

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { documentId, orgSlug } = Route.useParams();
  const documentNavigation = useDocumentNavigation(orgSlug);
  const query = useSettlementQuery({ documentId, orgSlug }, true);

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const detail = query.data;

  if (
    query.isError ||
    !detail ||
    detail.documentKind !== "settlement" ||
    detail.direction !== "received"
  ) {
    return (
      <PageLayout>
        <PageHeader description="This receipt could not be loaded." title="Receipt not found" />
      </PageLayout>
    );
  }

  const goToSelf = () => documentNavigation.salesReceipt(documentId);

  if (detail.status === "draft") {
    return (
      <PageLayout>
        <PageHeader
          description="Edit this draft, then post it to the ledger."
          title={`Edit receipt ${detail.draftReference}`}
        />
        <SettlementForm
          direction="received"
          document={detail}
          key={detail.id}
          onPosted={goToSelf}
          onSaved={goToSelf}
          orgSlug={orgSlug}
        />
      </PageLayout>
    );
  }

  return <DocumentDetail detail={detail} onVoided={() => void query.refetch()} orgSlug={orgSlug} />;
}
