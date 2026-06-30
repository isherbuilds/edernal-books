import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";

import { generateAppSeo } from "@/lib/seo";

import { useDocumentNavigation } from "@/hooks/use-document-navigation";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { InvoiceEditor } from "@/components/documents/invoice-editor";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices/new")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/sales/invoices/new`, locale: params.locale },
      description: "Create a customer invoice.",
      robots: { follow: false, index: false },
      title: "New invoice"
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

  const goToDocument = (documentId: string) => documentNavigation.salesInvoice(documentId);

  return (
    <PageLayout>
      <PageHeader
        description="Draft a customer invoice, then post it to the ledger."
        title="New invoice"
      />
      <InvoiceEditor
        document={null}
        onPosted={goToDocument}
        onSaved={goToDocument}
        orgSlug={orgSlug}
      />
    </PageLayout>
  );
}
