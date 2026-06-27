import { BookMarkedIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
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
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { formatMinorUnits } from "@/utils/accounting-format";

import { useChartAccountsQuery, useGeneralLedgerInfiniteQuery } from "@/hooks/use-accounting";

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
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const pages = ledgerQuery.data?.pages ?? [];
  const visibleLines = pages.flatMap((page) => page.lines);
  const balanceLabel = ledgerQuery.hasNextPage ? "Page-end" : "Closing";
  const openingBalanceMinor = pages[0]?.openingBalanceMinor;
  const pageEndBalanceMinor = pages.at(-1)?.closingBalanceMinor;

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookMarkedIcon className="size-4" />
          Reports
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">General ledger</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Account-level journal lines with opening, running, and closing balances.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select a ledger account and optional date range.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{selectedAccount ? selectedAccount.name : "Ledger lines"}</CardTitle>
          <CardDescription>
            {openingBalanceMinor && pageEndBalanceMinor
              ? `Opening ${formatMinorUnits(openingBalanceMinor)}; ${balanceLabel.toLowerCase()} ${formatMinorUnits(pageEndBalanceMinor)}.`
              : "Choose an account to load lines."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountsQuery.isLoading || (ledgerQuery.isLoading && visibleLines.length === 0) ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : accountsQuery.isError || ledgerQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="text-sm font-medium text-destructive">Could not load ledger</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {accountsQuery.error instanceof Error
                  ? accountsQuery.error.message
                  : ledgerQuery.error instanceof Error
                    ? ledgerQuery.error.message
                    : "General ledger request failed."}
              </p>
            </div>
          ) : !accountId ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookMarkedIcon />
                </EmptyMedia>
                <EmptyTitle>Select account</EmptyTitle>
                <EmptyDescription>Choose a ledger account to view posted lines.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : visibleLines.length === 0 ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookMarkedIcon />
                </EmptyMedia>
                <EmptyTitle>No ledger lines</EmptyTitle>
                <EmptyDescription>No posted journal lines match these filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border bg-background">
                <Table className="min-w-[780px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Running</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleLines.map((line) => (
                      <TableRow key={`${line.journalEntryId}-${line.lineNumber}`}>
                        <TableCell className="tabular-nums">{line.postingDate}</TableCell>
                        <TableCell className="font-medium">{line.entryNumber}</TableCell>
                        <TableCell>{line.description ?? "No description"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMinorUnits(line.debitMinor)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMinorUnits(line.creditMinor)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMinorUnits(line.runningBalanceMinor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {ledgerQuery.hasNextPage ? (
                <Button
                  className="self-start"
                  disabled={ledgerQuery.isFetchingNextPage}
                  onClick={() => ledgerQuery.fetchNextPage()}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  {ledgerQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
