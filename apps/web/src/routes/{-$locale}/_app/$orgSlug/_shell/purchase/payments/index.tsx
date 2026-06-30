import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

import { generateAppSeo } from "@/lib/seo";

import { getSettlementsInfiniteQueryOptions, useSettlementsQuery } from "@/hooks/use-documents";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { DocumentListPage } from "@/components/documents/document-list-page";

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
  const documents = useMemo(
    () => query.data?.pages.flatMap((page) => page.documents) ?? [],
    [query.data]
  );

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return (
    <DocumentListPage
      description="Record money paid to vendors."
      documents={documents}
      error={query.error}
      hasNextPage={query.hasNextPage}
      isError={query.isError}
      isFetchingNextPage={query.isFetchingNextPage}
      isLoading={query.isLoading}
      newLabel="New payment"
      onLoadMore={() => query.fetchNextPage()}
      onNew={() => navigate({ params: { orgSlug }, to: "/$orgSlug/purchase/payments/new" })}
      onRowClick={(document) =>
        navigate({
          params: { documentId: document.id, orgSlug },
          to: "/$orgSlug/purchase/payments/$documentId"
        })
      }
      showOutstanding={false}
      title="Payments"
    />
  );
}
