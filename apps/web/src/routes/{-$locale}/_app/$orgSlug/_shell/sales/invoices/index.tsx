import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { getSalesInvoicesInfiniteQueryOptions, useSalesInvoicesQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentListPage } from "@/components/documents/document-list-page";
import { getQueryState } from "@/components/query-state-model";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/invoices/")({
  ssr: "data-only",
  loader: async ({ context, params }) => {
    await context.queryClient.ensureInfiniteQueryData(
      getSalesInvoicesInfiniteQueryOptions({ orgSlug: params.orgSlug })
    );
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/sales/invoices`, locale: params.locale },
      description: "Draft, post, and void customer invoices.",
      robots: { follow: false, index: false },
      title: "Invoices"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const query = useSalesInvoicesQuery({ orgSlug });
  const documents = [];
  for (const page of query.data?.pages ?? []) {
    documents.push(...page.documents);
  }

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return (
    <DocumentListPage
      amountMode="outstanding"
      description="Draft, post, and void customer invoices."
      documents={documents}
      newLabel="New invoice"
      onLoadMore={() => query.fetchNextPage()}
      onNew={() => navigate({ params: { orgSlug }, to: "/$orgSlug/sales/invoices/new" })}
      onRowClick={(document) =>
        navigate({
          params: { documentId: document.id, orgSlug },
          to: "/$orgSlug/sales/invoices/$documentId"
        })
      }
      pagination={{
        hasNextPage: query.hasNextPage,
        loadingNextPage: query.isFetchingNextPage
      }}
      queryState={getQueryState({
        dataPresent: Boolean(query.data),
        empty: documents.length === 0,
        error: query.error,
        errored: query.isError,
        loading: query.isLoading
      })}
      title="Invoices"
    />
  );
}
