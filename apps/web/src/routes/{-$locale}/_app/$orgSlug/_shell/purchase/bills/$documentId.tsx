import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { generateAppSeo } from "@/lib/seo";

import { usePurchaseDocumentQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { BillEditor } from "@/components/documents/bill-editor";
import { DocumentDetail } from "@/components/documents/document-detail";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/purchase/bills/$documentId")(
  {
    head: ({ params }) =>
      generateAppSeo({
        alternates: {
          canonicalPath: `/${params.orgSlug}/purchase/bills/${params.documentId}`,
          locale: params.locale
        },
        description: "View or edit a vendor bill.",
        robots: { follow: false, index: false },
        title: "Bill"
      }),
    component: RouteComponent
  }
);

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { documentId, orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const query = usePurchaseDocumentQuery({ documentId, orgSlug }, true);

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
    (detail.documentKind !== "purchase_bill" && detail.documentKind !== "expense")
  ) {
    return (
      <PageLayout>
        <PageHeader description="This bill could not be loaded." title="Bill not found" />
      </PageLayout>
    );
  }

  const goToSelf = () =>
    navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/purchase/bills/$documentId" });

  if (detail.status === "draft") {
    return (
      <PageLayout>
        <PageHeader
          description="Edit this draft, then post it to the ledger."
          title={`Edit bill ${detail.draftReference}`}
        />
        <BillEditor
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
