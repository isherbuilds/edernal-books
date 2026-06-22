import {
  ArrowRightIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  FileTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon
} from "lucide-react";
import { lazy, Suspense } from "react";

import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from "@tsu-stack/ui/components/breadcrumb";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { type ChartConfig } from "@tsu-stack/ui/components/chart";
import { Separator } from "@tsu-stack/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

type DashboardUser = {
  email?: string | null;
  name?: string | null;
};

type DashboardPageProps = {
  user: DashboardUser;
};

const CashMovementChart = lazy(() =>
  import("./cash-movement-chart").then((module) => {
    return { default: module.CashMovementChart };
  })
);

const metricCards = [
  {
    description: "74 days runway after committed payouts",
    label: "Cash balance",
    trend: "up",
    value: "INR 14.82L",
    variance: "+8.2%"
  },
  {
    description: "42 invoices open across 18 customers",
    label: "Receivables",
    trend: "up",
    value: "INR 8.46L",
    variance: "+11.4%"
  },
  {
    description: "Vendor bills due before Friday",
    label: "Payables",
    trend: "down",
    value: "INR 3.18L",
    variance: "-4.1%"
  },
  {
    description: "GSTR-1 draft waiting review",
    label: "Compliance",
    trend: "up",
    value: "3 tasks",
    variance: "2 due"
  }
] as const;

const cashFlowData = [
  { date: "May 21", cashIn: 62, cashOut: 44 },
  { date: "May 26", cashIn: 74, cashOut: 51 },
  { date: "May 31", cashIn: 58, cashOut: 39 },
  { date: "Jun 05", cashIn: 91, cashOut: 47 },
  { date: "Jun 10", cashIn: 86, cashOut: 56 },
  { date: "Jun 15", cashIn: 112, cashOut: 63 },
  { date: "Jun 19", cashIn: 126, cashOut: 58 }
];

const chartConfig = {
  cashIn: {
    color: "var(--chart-1)",
    label: "Cash in"
  },
  cashOut: {
    color: "var(--chart-2)",
    label: "Cash out"
  }
} satisfies ChartConfig;

const recentInvoices = [
  {
    amount: "INR 2,40,000",
    customer: "Northwind Labs",
    invoice: "INV-1045",
    status: "Paid"
  },
  {
    amount: "INR 89,000",
    customer: "Blue River Co.",
    invoice: "INV-1044",
    status: "Pending"
  },
  {
    amount: "INR 5,12,000",
    customer: "Oak Street Studio",
    invoice: "INV-1043",
    status: "Paid"
  },
  {
    amount: "INR 31,050",
    customer: "Harbor Freight LLC",
    invoice: "INV-1042",
    status: "Overdue"
  }
] as const;

const attentionItems = [
  { count: "3", label: "Overdue invoices", meta: "Send reminders" },
  { count: "2", label: "GST mismatches", meta: "Review HSN and tax rate" },
  { count: "5", label: "Uncategorized expenses", meta: "Map ledger accounts" }
] as const;

const taxEvents = [
  { date: "Jun 20", label: "GSTR-3B payment", status: "Draft ready" },
  { date: "Jun 25", label: "TDS challan check", status: "Needs review" },
  { date: "Jun 30", label: "Bank reconciliation close", status: "Scheduled" }
] as const;

export function DashboardPage({ user }: DashboardPageProps) {
  const userName = getDisplayName(user);

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                  Good morning, {userName}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Cash, compliance, and owner actions for the current business.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <ShieldCheckIcon data-icon="inline-start" />
                Tenant secured
              </Badge>
              <Button size="sm" variant="outline">
                <SearchIcon data-icon="inline-start" />
                Search
              </Button>
              <Button size="sm" variant="outline">
                <BellIcon data-icon="inline-start" />
                Alerts
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => {
              const isPositive = metric.trend === "up";
              const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

              return (
                <Card className="@container/card" key={metric.label}>
                  <CardHeader>
                    <CardDescription>{metric.label}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[260px]/card:text-3xl">
                      {metric.value}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendIcon data-icon="inline-start" />
                        {metric.variance}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="text-sm text-muted-foreground">
                    {metric.description}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash movement</CardTitle>
              <CardDescription>Daily cash in and cash out for the last 30 days.</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline">
                  <CalendarDaysIcon data-icon="inline-start" />
                  Last 30 days
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-2 sm:px-6">
              <Suspense
                fallback={<div className="h-[280px] w-full animate-pulse rounded-md bg-muted" />}
              >
                <CashMovementChart config={chartConfig} data={cashFlowData} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Open amounts and payment state.</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline">
                  <FileTextIcon data-icon="inline-start" />
                  View all
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice) => (
                      <TableRow key={invoice.invoice}>
                        <TableCell className="font-medium">{invoice.customer}</TableCell>
                        <TableCell className="text-muted-foreground">{invoice.invoice}</TableCell>
                        <TableCell className="text-right tabular-nums">{invoice.amount}</TableCell>
                        <TableCell className="text-right">
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>AI insight</CardTitle>
              <CardDescription>Accounting checks that need owner attention.</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline">
                  <SparklesIcon data-icon="inline-start" />
                  Ask
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <p className="leading-relaxed">
                GST output tax trails collections by 2.1%. Review two invoices before filing
                GSTR-3B.
              </p>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold tabular-nums">82%</span>
                  <span className="text-xs text-muted-foreground">Matched</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold tabular-nums">12</span>
                  <span className="text-xs text-muted-foreground">Rules</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold tabular-nums">3</span>
                  <span className="text-xs text-muted-foreground">Flags</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Small tasks blocking month-end close.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {attentionItems.map((item) => (
                <Button
                  className="h-auto justify-between px-3 py-3"
                  key={item.label}
                  type="button"
                  variant="ghost"
                >
                  <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax calendar</CardTitle>
              <CardDescription>Upcoming compliance dates.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {taxEvents.map((event) => (
                <div className="flex items-start gap-3" key={event.label}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs font-medium tabular-nums">
                    {event.date.split(" ")[1]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{event.label}</div>
                    <div className="text-xs text-muted-foreground">{event.status}</div>
                  </div>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="mt-1 size-4 text-muted-foreground"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: (typeof recentInvoices)[number]["status"] }) {
  if (status === "Overdue") {
    return <Badge variant="destructive">{status}</Badge>;
  }

  if (status === "Pending") {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge variant="secondary">
      <CheckCircle2Icon data-icon="inline-start" />
      {status}
    </Badge>
  );
}

function getDisplayName(user: DashboardUser) {
  const name = user.name?.trim();
  if (name && name.length > 0) {
    return name;
  }

  return "Owner";
}
