import { BookOpenIcon } from "lucide-react";

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
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { useChartAccountsQuery } from "@/hooks/use-accounting";

type ChartOfAccountsPageProps = {
  orgSlug: string;
};

export function ChartOfAccountsPage({ orgSlug }: ChartOfAccountsPageProps) {
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const accounts = accountsQuery.data?.accounts ?? [];

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpenIcon className="size-4" />
          Settings
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Chart of accounts</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ledger accounts available to journals and accounting reports.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Ordered by chart sort and account code.</CardDescription>
        </CardHeader>
        <CardContent>
          {accountsQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : accountsQuery.isError ? (
            <ErrorBlock error={accountsQuery.error} />
          ) : accounts.length === 0 ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenIcon />
                </EmptyMedia>
                <EmptyTitle>No ledger accounts</EmptyTitle>
                <EmptyDescription>
                  Complete business onboarding to create the default chart.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Normal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium tabular-nums">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="capitalize">{account.accountCategory}</TableCell>
                      <TableCell>{account.accountType}</TableCell>
                      <TableCell className="capitalize">{account.normalBalance}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {account.isGroup ? <Badge variant="outline">Group</Badge> : null}
                          {!account.active ? <Badge variant="destructive">Inactive</Badge> : null}
                          {account.allowManualPosting ? (
                            <Badge variant="secondary">Manual</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ErrorBlock({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="text-sm font-medium text-destructive">Could not load accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Accounting read failed."}
      </p>
    </div>
  );
}
