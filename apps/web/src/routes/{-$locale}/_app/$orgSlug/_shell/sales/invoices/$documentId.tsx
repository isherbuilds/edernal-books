import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { generateAppSeo } from "@/lib/seo";

import { useDocumentNavigation } from "@/hooks/use-document-navigation";
import { useSalesDocumentQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentDetail } from "@/components/documents/document-detail";
import { InvoiceEditor } from "@/components/documents/invoice-editor";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices/$documentId")(
  {
    head: ({ params }) =>
      generateAppSeo({
        alternates: {
          canonicalPath: `/${params.orgSlug}/sales/invoices/${params.documentId}`,
          locale: params.locale
        },
        description: "View or edit a customer invoice.",
        robots: { follow: false, index: false },
        title: "Invoice"
      }),
    component: RouteComponent
  }
);

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { documentId, orgSlug } = Route.useParams();
  const documentNavigation = useDocumentNavigation(orgSlug);
  const query = useSalesDocumentQuery({ documentId, orgSlug }, true);

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

  if (query.isError || !detail || detail.documentKind !== "sales_invoice") {
    return (
      <PageLayout>
        <PageHeader description="This invoice could not be loaded." title="Invoice not found" />
      </PageLayout>
    );
  }

  const goToSelf = () => documentNavigation.salesInvoice(documentId);

  if (detail.status === "draft") {
    return (
      <PageLayout>
        <PageHeader
          description="Edit this draft, then post it to the ledger."
          title={`Edit invoice ${detail.draftReference}`}
        />
        <InvoiceEditor
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
