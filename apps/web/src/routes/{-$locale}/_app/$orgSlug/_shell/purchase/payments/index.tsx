import { createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { getSettlementsInfiniteQueryOptions, useSettlementsQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentListPage } from "@/components/documents/document-list-page";
import { getQueryState } from "@/components/query-state-model";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/purchase/payments/")({
  ssr: "data-only",
  loader: async ({ context, params }) => {
    await context.queryClient.ensureInfiniteQueryData(
      getSettlementsInfiniteQueryOptions({ direction: "paid", orgSlug: params.orgSlug })
    );
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/${params.orgSlug}/purchase/payments`, locale: params.locale },
      description: "Record money paid to vendors.",
      robots: { follow: false, index: false },
      title: "Payments"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const query = useSettlementsQuery({ direction: "paid", orgSlug });
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
      description="Record money paid to vendors."
      documents={documents}
      newLabel="New payment"
      onLoadMore={() => query.fetchNextPage()}
      onNew={() => navigate({ params: { orgSlug }, to: "/$orgSlug/purchase/payments/new" })}
      onRowClick={(document) =>
        navigate({
          params: { documentId: document.id, orgSlug },
          to: "/$orgSlug/purchase/payments/$documentId"
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
      title="Payments"
    />
  );
}
