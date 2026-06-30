import { BookMarkedIcon } from "lucide-react";
import { useState } from "react";

import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { formatMinorUnits } from "@/utils/accounting-format";

import { useChartAccountsQuery, useGeneralLedgerInfiniteQuery } from "@/hooks/use-accounting";

import {
  type DataColumn,
  DataTable,
  DataTableContainer,
  DataTableLoadMore
} from "@/components/data-table";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";

type GeneralLedgerPageProps = {
  orgSlug: string;
};

export function GeneralLedgerPage({ orgSlug }: GeneralLedgerPageProps) {
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const accounts = accountsQuery.data?.accounts.filter((account) => !account.isGroup) ?? [];
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const ledgerQuery = useGeneralLedgerInfiniteQuery(orgSlug, {
    accountId,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });
  const pages = ledgerQuery.data?.pages ?? [];
  const visibleLines = pages.flatMap((page) => page.lines);
  const balanceLabel = ledgerQuery.hasNextPage ? "loaded-page closing balance" : "closing balance";
  const openingBalanceMinor = pages[0]?.openingBalanceMinor;
  const pageEndBalanceMinor = pages.at(-1)?.closingBalanceMinor;

  const columns: DataColumn<(typeof visibleLines)[number]>[] = [
    {
      cell: (line) => line.postingDate,
      cellClassName: "tabular-nums",
      header: "Date",
      id: "date"
    },
    {
      cell: (line) => line.entryNumber,
      cellClassName: "font-medium",
      header: "Entry",
      id: "entry"
    },
    {
      cell: (line) => line.description ?? "No description",
      header: "Description",
      id: "description"
    },
    {
      align: "right",
      cell: (line) => formatMinorUnits(line.debitMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Debit",
      id: "debit"
    },
    {
      align: "right",
      cell: (line) => formatMinorUnits(line.creditMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Credit",
      id: "credit"
    },
    {
      align: "right",
      cell: (line) => formatMinorUnits(line.runningBalanceMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Running",
      id: "running"
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        description="Account-level journal lines with opening, running, and closing balances."
        title="General ledger"
      />

      <FieldGroup className="grid gap-4 md:grid-cols-[minmax(240px,1fr)_160px_160px]">
        <Field>
          <FieldLabel htmlFor="general-ledger-account">Account</FieldLabel>
          <Select onValueChange={(value) => setAccountId(value ?? "")} value={accountId}>
            <SelectTrigger className="w-full" id="general-ledger-account">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="general-ledger-from">From</FieldLabel>
          <Input
            id="general-ledger-from"
            onChange={(event) => setFromDate(event.currentTarget.value)}
            type="date"
            value={fromDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="general-ledger-to">To</FieldLabel>
          <Input
            id="general-ledger-to"
            onChange={(event) => setToDate(event.currentTarget.value)}
            type="date"
            value={toDate}
          />
        </Field>
      </FieldGroup>

      <QueryState
        empty={
          accountId ? (
            <EmptyState
              description="No posted journal lines match these filters."
              icon={<BookMarkedIcon className="size-5" />}
              title="No ledger lines"
            />
          ) : (
            <EmptyState
              description="Choose a ledger account to view posted lines."
              icon={<BookMarkedIcon className="size-5" />}
              title="Select account"
            />
          )
        }
        error={accountsQuery.error ?? ledgerQuery.error}
        errorFallback="General ledger request failed."
        errorTitle="Could not load ledger"
        isEmpty={!accountId || visibleLines.length === 0}
        isError={accountsQuery.isError || ledgerQuery.isError}
        isLoading={accountsQuery.isLoading || (ledgerQuery.isLoading && visibleLines.length === 0)}
      >
        <div className="flex flex-col gap-3">
          {openingBalanceMinor != null && pageEndBalanceMinor != null ? (
            <p className="text-sm text-muted-foreground">
              Opening {formatMinorUnits(openingBalanceMinor)}; {balanceLabel}{" "}
              {formatMinorUnits(pageEndBalanceMinor)}.
            </p>
          ) : null}

          <DataTableContainer>
            <DataTable
              columns={columns}
              getRowId={(line) => `${line.journalEntryId}-${line.lineNumber}`}
              minWidthClassName="min-w-[780px]"
              rows={visibleLines}
            />
            {ledgerQuery.hasNextPage ? (
              <div className="border-t">
                <DataTableLoadMore
                  isFetchingNextPage={ledgerQuery.isFetchingNextPage}
                  loadingLabel="Loading…"
                  loadLabel="Load more"
                  onLoadMore={() => {
                    void ledgerQuery.fetchNextPage();
                  }}
                />
              </div>
            ) : null}
          </DataTableContainer>
        </div>
      </QueryState>
    </PageLayout>
  );
}
