import { BookOpenIcon } from "lucide-react";

import { Badge } from "@tsu-stack/ui/components/badge";

import { useChartAccountsQuery } from "@/hooks/use-accounting";

import { type DataColumn, DataTable } from "@/components/data-table";
import { DataTableContainer } from "@/components/data-table-container";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import { getQueryState } from "@/components/query-state-model";

type ChartOfAccountsPageProps = {
  orgSlug: string;
};

export function ChartOfAccountsPage({ orgSlug }: ChartOfAccountsPageProps) {
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const accounts = accountsQuery.data?.accounts ?? [];

  const columns: DataColumn<(typeof accounts)[number]>[] = [
    {
      cell: (account) => account.code,
      cellClassName: "font-medium tabular-nums",
      header: "Code",
      id: "code"
    },
    {
      cell: (account) => account.name,
      header: "Name",
      id: "name"
    },
    {
      cell: (account) => account.accountCategory,
      cellClassName: "capitalize",
      header: "Category",
      id: "category"
    },
    {
      cell: (account) => account.accountType,
      header: "Type",
      id: "type"
    },
    {
      cell: (account) => account.normalBalance,
      cellClassName: "capitalize",
      header: "Normal",
      id: "normal"
    },
    {
      cell: (account) => (
        <div className="flex flex-wrap gap-1">
          {account.isGroup ? <Badge variant="outline">Group</Badge> : null}
          {!account.active ? <Badge variant="destructive">Inactive</Badge> : null}
          {account.allowManualPosting ? <Badge variant="secondary">Manual</Badge> : null}
        </div>
      ),
      header: "Status",
      id: "status"
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        description="Ledger accounts available to journals and accounting reports."
        title="Chart of accounts"
      />

      <QueryState
        empty={
          <EmptyState
            description="Complete business onboarding to create the default chart."
            icon={<BookOpenIcon className="size-5" />}
            title="No ledger accounts"
          />
        }
        errorFallback="Accounting read failed."
        errorTitle="Could not load accounts"
        state={getQueryState({
          dataPresent: accountsQuery.data !== undefined,
          empty: accounts.length === 0,
          error: accountsQuery.error,
          errored: accountsQuery.isError,
          loading: accountsQuery.isLoading
        })}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(account) => account.id}
            minWidthClassName="min-w-[760px]"
            rows={accounts}
          />
        </DataTableContainer>
      </QueryState>
    </PageLayout>
  );
}
