import { type DocumentRegisterItem } from "@tsu-stack/core/documents";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";

import { formatMinorUnits } from "@/utils/accounting-format";

import { documentStatusLabel } from "@/hooks/use-documents";

import { type DataColumn, DataTable } from "@/components/data-table";
import { DataTableContainer } from "@/components/data-table-container";
import { DataTableLoadMore } from "@/components/data-table-load-more";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import { type QueryRenderState } from "@/components/query-state-model";

type DocumentListPageProps = {
  amountMode: "total" | "outstanding";
  description: string;
  documents: ReadonlyArray<DocumentRegisterItem>;
  error?: unknown;
  newLabel: string;
  onLoadMore: () => void;
  onNew: () => void;
  pagination: {
    hasNextPage: boolean;
    loadingNextPage: boolean;
  };
  queryState: QueryRenderState;
  onRowClick: (document: DocumentRegisterItem) => void;
  title: string;
};

function statusVariant(status: DocumentRegisterItem["status"]) {
  switch (status) {
    case "posted":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "voided":
      return "outline" as const;
  }
}

export function DocumentListPage({
  amountMode,
  description,
  documents,
  newLabel,
  onLoadMore,
  onNew,
  pagination,
  queryState,
  onRowClick,
  title
}: DocumentListPageProps) {
  const columns: DataColumn<DocumentRegisterItem>[] = [
    {
      cell: (document) => document.documentNumber ?? document.draftReference,
      cellClassName: "font-medium",
      header: "Number",
      id: "number"
    },
    {
      cell: (document) => document.documentDate,
      cellClassName: "tabular-nums",
      header: "Date",
      id: "date"
    },
    {
      align: "right",
      cell: (document) => (
        <span className="font-amount tabular-nums">{formatMinorUnits(document.totalMinor)}</span>
      ),
      header: "Total",
      id: "total"
    },
    ...(amountMode === "outstanding"
      ? [
          {
            align: "right",
            cell: (document: DocumentRegisterItem) =>
              document.outstandingMinor === null ? (
                "—"
              ) : (
                <span className="font-amount tabular-nums">
                  {formatMinorUnits(document.outstandingMinor)}
                </span>
              ),
            header: "Outstanding",
            id: "outstanding"
          } satisfies DataColumn<DocumentRegisterItem>
        ]
      : []),
    {
      cell: (document) => (
        <Badge variant={statusVariant(document.status)}>
          {documentStatusLabel(document.status)}
        </Badge>
      ),
      header: "Status",
      id: "status"
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        actions={<Button onClick={onNew}>{newLabel}</Button>}
        description={description}
        title={title}
      />
      <QueryState
        empty={
          <EmptyState
            actionLabel={newLabel}
            description={description}
            onAction={onNew}
            title={`No ${title.toLowerCase()} yet`}
          />
        }
        errorFallback="Could not load documents."
        errorTitle="Something went wrong"
        state={queryState}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(document) => document.id}
            onRowClick={onRowClick}
            rows={documents}
          />
          {pagination.hasNextPage ? (
            <div className="border-t">
              <DataTableLoadMore
                isFetchingNextPage={pagination.loadingNextPage}
                loadLabel="Load more"
                loadingLabel="Loading…"
                onLoadMore={onLoadMore}
              />
            </div>
          ) : null}
        </DataTableContainer>
      </QueryState>
    </PageLayout>
  );
}
