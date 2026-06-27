import { useQuery } from "@tanstack/react-query";
import { CalendarRangeIcon } from "lucide-react";

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
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

type AccountingPeriodsPageProps = {
  orgSlug: string;
};

export function AccountingPeriodsPage({ orgSlug }: AccountingPeriodsPageProps) {
  const periodsQuery = useQuery(
    orpc.accounting.periods.list.queryOptions({
      input: {
        orgSlug
      }
    })
  );
  const periods = periodsQuery.data?.periods ?? [];

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarRangeIcon className="size-4" />
          Settings
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Accounting periods</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Fiscal periods that control posting dates and report boundaries.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Periods</CardTitle>
          <CardDescription>Ordered by start date.</CardDescription>
        </CardHeader>
        <CardContent>
          {periodsQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : periodsQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="text-sm font-medium text-destructive">Could not load periods</h2>
              <p className="mt-1 text-sm text-muted-foreground">Accounting period read failed.</p>
            </div>
          ) : periods.length === 0 ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarRangeIcon />
                </EmptyMedia>
                <EmptyTitle>No accounting periods</EmptyTitle>
                <EmptyDescription>
                  Complete business onboarding to create the first fiscal year and periods.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell className="tabular-nums">{period.startDate}</TableCell>
                      <TableCell className="tabular-nums">{period.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={period.status === "open" ? "secondary" : "outline"}>
                          {period.status}
                        </Badge>
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
