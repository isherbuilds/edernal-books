import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { SettlementForm } from "@/components/documents/settlement-form";
import { PageHeader, PageLayout } from "@/components/page-layout";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/receipts/new")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/sales/receipts/new`, locale: params.locale },
      description: "Record a customer receipt.",
      robots: { follow: false, index: false },
      title: "New receipt"
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
    navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/sales/receipts/$documentId" });

  return (
    <PageLayout>
      <PageHeader
        description="Record money received and allocate it to open invoices."
        title="New receipt"
      />
      <SettlementForm
        direction="received"
        document={null}
        onPosted={goToDocument}
        onSaved={goToDocument}
        orgSlug={orgSlug}
      />
    </PageLayout>
  );
}
