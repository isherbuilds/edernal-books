import { useQuery } from "@tanstack/react-query";
import { CalendarRangeIcon } from "lucide-react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";

import { type DataColumn, DataTable } from "@/components/data-table";
import { DataTableContainer } from "@/components/data-table-container";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import { getQueryState } from "@/components/query-state-model";

type AccountingPeriodsPageProps = {
  orgSlug: string;
};

export function AccountingPeriodsPage({ orgSlug }: AccountingPeriodsPageProps) {
  const {
    data: periodsData,
    error,
    isError,
    isLoading
  } = useQuery(
    orpc.accounting.periods.list.queryOptions({
      input: {
        orgSlug
      }
    })
  );
  const periods = periodsData?.periods ?? [];

  const columns: DataColumn<(typeof periods)[number]>[] = [
    {
      cell: (period) => period.name,
      cellClassName: "font-medium",
      header: "Name",
      id: "name"
    },
    {
      cell: (period) => period.startDate,
      cellClassName: "tabular-nums",
      header: "Start",
      id: "start"
    },
    {
      cell: (period) => period.endDate,
      cellClassName: "tabular-nums",
      header: "End",
      id: "end"
    },
    {
      cell: (period) => (
        <Badge variant={period.status === "open" ? "secondary" : "outline"}>{period.status}</Badge>
      ),
      header: "Status",
      id: "status"
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        description="Fiscal periods that control posting dates and report boundaries."
        title="Accounting periods"
      />

      <QueryState
        empty={
          <EmptyState
            description="Complete business onboarding to create the first fiscal year and periods."
            icon={<CalendarRangeIcon className="size-5" />}
            title="No accounting periods"
          />
        }
        errorFallback="Accounting period read failed."
        errorTitle="Could not load periods"
        state={getQueryState({
          empty: periods.length === 0,
          error,
          errored: isError,
          loading: isLoading
        })}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(period) => period.id}
            minWidthClassName="min-w-[720px]"
            rows={periods}
          />
        </DataTableContainer>
      </QueryState>
    </PageLayout>
  );
}
