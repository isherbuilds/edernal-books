import { useQuery } from "@tanstack/react-query";
import { ScaleIcon } from "lucide-react";
import { useState } from "react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
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
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { formatMinorUnits, getTodayDateString } from "@/utils/accounting-format";

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

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ScaleIcon className="size-4" />
          Reports
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Trial balance</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Debit and credit totals by account from posted journal lines.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>As of date</CardTitle>
          <CardDescription>Report includes entries posted through this date.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-56">
            <Field>
              <FieldLabel htmlFor="trial-balance-as-of">As of</FieldLabel>
              <Input
                id="trial-balance-as-of"
                onChange={(event) => setAsOfDate(event.currentTarget.value)}
                type="date"
                value={asOfDate}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Balances</CardTitle>
          <CardDescription>
            {trialBalance ? (
              <Badge variant={trialBalance.isBalanced ? "secondary" : "destructive"}>
                {trialBalance.isBalanced ? "Balanced" : "Out of balance"}
              </Badge>
            ) : (
              "Waiting for report data."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trialBalanceQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : trialBalanceQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="text-sm font-medium text-destructive">Could not load trial balance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {trialBalanceQuery.error instanceof Error
                  ? trialBalanceQuery.error.message
                  : "Trial balance request failed."}
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScaleIcon />
                </EmptyMedia>
                <EmptyTitle>No balances</EmptyTitle>
                <EmptyDescription>No posted journal lines exist for this date.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell className="font-medium">
                        {account.accountCode} {account.accountName}
                      </TableCell>
                      <TableCell className="capitalize">{account.accountCategory}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinorUnits(account.debitMinor)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinorUnits(account.creditMinor)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinorUnits(account.balanceMinor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trialBalance ? formatMinorUnits(trialBalance.totalDebitMinor) : "0.00"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trialBalance ? formatMinorUnits(trialBalance.totalCreditMinor) : "0.00"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
