import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { getSettlementsInfiniteQueryOptions, useSettlementsQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentListPage } from "@/components/documents/document-list-page";
import { getQueryState } from "@/components/query-state-model";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/sales/receipts/")({
  ssr: "data-only",
  loader: async ({ context, params }) => {
    await context.queryClient.ensureInfiniteQueryData(
      getSettlementsInfiniteQueryOptions({ direction: "received", orgSlug: params.orgSlug })
    );
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/sales/receipts`, locale: params.locale },
      description: "Record money received from customers.",
      robots: { follow: false, index: false },
      title: "Receipts"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const query = useSettlementsQuery({ direction: "received", orgSlug });
  const documents = [];
  for (const page of query.data?.pages ?? []) {
    documents.push(...page.documents);
  }

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return (
    <DocumentListPage
      amountMode="total"
      description="Record money received from customers."
      documents={documents}
      newLabel="New receipt"
      onLoadMore={() => query.fetchNextPage()}
      onNew={() => navigate({ params: { orgSlug }, to: "/$orgSlug/sales/receipts/new" })}
      onRowClick={(document) =>
        navigate({
          params: { documentId: document.id, orgSlug },
          to: "/$orgSlug/sales/receipts/$documentId"
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
      title="Receipts"
    />
  );
}
