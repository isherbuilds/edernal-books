import { useQuery } from "@tanstack/react-query";
import { ScaleIcon } from "lucide-react";
import { useState } from "react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { TableCell, TableRow } from "@tsu-stack/ui/components/table";

import { formatMinorUnits, getTodayDateString } from "@/utils/accounting-format";

import { type DataColumn, DataTable, DataTableContainer } from "@/components/data-table";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";

type TrialBalancePageProps = {
  orgSlug: string;
};

export function TrialBalancePage({ orgSlug }: TrialBalancePageProps) {
  const [asOfDate, setAsOfDate] = useState(getTodayDateString());
  const trialBalanceQuery = useQuery(
    orpc.accounting.reports.trialBalance.queryOptions({
      input: {
        asOfDate,
        orgSlug
      }
    })
  );
  const trialBalance = trialBalanceQuery.data;
  const accounts = trialBalance?.accounts ?? [];

  const columns: DataColumn<(typeof accounts)[number]>[] = [
    {
      cell: (account) => `${account.accountCode} ${account.accountName}`,
      cellClassName: "font-medium",
      header: "Account",
      id: "account"
    },
    {
      cell: (account) => account.accountCategory,
      cellClassName: "capitalize",
      header: "Category",
      id: "category"
    },
    {
      align: "right",
      cell: (account) => formatMinorUnits(account.debitMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Debit",
      id: "debit"
    },
    {
      align: "right",
      cell: (account) => formatMinorUnits(account.creditMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Credit",
      id: "credit"
    },
    {
      align: "right",
      cell: (account) => formatMinorUnits(account.balanceMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Balance",
      id: "balance"
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        description="Debit and credit totals by account from posted journal lines."
        eyebrow="Reports"
        icon={<ScaleIcon className="size-4" />}
        title="Trial balance"
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <FieldGroup className="w-full sm:max-w-56">
          <Field>
            <FieldLabel htmlFor="trial-balance-as-of">As of date</FieldLabel>
            <Input
              id="trial-balance-as-of"
              onChange={(event) => setAsOfDate(event.currentTarget.value)}
              type="date"
              value={asOfDate}
            />
          </Field>
        </FieldGroup>
        {trialBalance ? (
          <Badge variant={trialBalance.isBalanced ? "secondary" : "destructive"}>
            {trialBalance.isBalanced ? "Balanced" : "Out of balance"}
          </Badge>
        ) : null}
      </div>

      <QueryState
        empty={
          <EmptyState
            description="No posted journal lines exist for this date."
            icon={<ScaleIcon className="size-5" />}
            title="No balances"
          />
        }
        error={trialBalanceQuery.error}
        errorFallback="Trial balance request failed."
        errorTitle="Could not load trial balance"
        isEmpty={accounts.length === 0}
        isError={trialBalanceQuery.isError}
        isLoading={trialBalanceQuery.isLoading}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            footer={
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="font-amount text-right tabular-nums">
                  {trialBalance ? formatMinorUnits(trialBalance.totalDebitMinor) : "0.00"}
                </TableCell>
                <TableCell className="font-amount text-right tabular-nums">
                  {trialBalance ? formatMinorUnits(trialBalance.totalCreditMinor) : "0.00"}
                </TableCell>
                <TableCell />
              </TableRow>
            }
            getRowId={(account) => account.accountId}
            minWidthClassName="min-w-[760px]"
            rows={accounts}
          />
        </DataTableContainer>
      </QueryState>
    </PageLayout>
  );
}
