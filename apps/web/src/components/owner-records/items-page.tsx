import { BoxesIcon, PlusIcon, SearchIcon } from "lucide-react";
import { type ComponentProps, type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { type Item, type ItemKind, type ItemUsage } from "@tsu-stack/core/items";
import { Badge } from "@tsu-stack/ui/components/badge";
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

import { formatMinorUnits, parseDecimalAmountToMinorUnits } from "@/utils/accounting-format";

import { useChartAccountsQuery } from "@/hooks/use-accounting";
import {
  useCreateItemMutation,
  useItemsQuery,
  useSetItemActiveMutation
} from "@/hooks/use-owner-records";

import { AccountSearchSelect } from "@/components/accounting/account-search-select";

type ItemsPageProps = {
  orgSlug: string;
};

type ItemFormState = {
  description: string;
  expenseAccountId: string;
  kind: ItemKind;
  name: string;
  purchaseRate: string;
  salesAccountId: string;
  salesRate: string;
  unit: string;
  usage: ItemUsage;
};

const itemKinds: Array<{ label: string; value: ItemKind }> = [
  { label: "Goods", value: "goods" },
  { label: "Service", value: "service" }
];

const itemUsages: Array<{ label: string; value: ItemUsage }> = [
  { label: "Sales", value: "sales" },
  { label: "Purchases", value: "purchases" },
  { label: "Both", value: "both" }
];

const initialItemForm: ItemFormState = {
  description: "",
  expenseAccountId: "",
  kind: "service",
  name: "",
  purchaseRate: "",
  salesAccountId: "",
  salesRate: "",
  unit: "nos",
  usage: "sales"
};

export function ItemsPage({ orgSlug }: ItemsPageProps) {
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [usage, setUsage] = useState<ItemUsage | "all">("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ItemFormState>(initialItemForm);
  const itemsQuery = useItemsQuery({
    includeInactive: true,
    kind: kind === "all" ? undefined : kind,
    orgSlug,
    q: query.trim() || undefined,
    usage: usage === "all" ? undefined : usage
  });
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const accounts = useMemo(
    () =>
      (accountsQuery.data?.accounts ?? []).filter(
        (account) => account.active && !account.isGroup && account.allowManualPosting
      ),
    [accountsQuery.data?.accounts]
  );
  const createItem = useCreateItemMutation();
  const setItemActive = useSetItemActiveMutation();
  const items = itemsQuery.data?.items ?? [];

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const salesRate = parseDecimalAmountToMinorUnits(form.salesRate);
    const purchaseRate = parseDecimalAmountToMinorUnits(form.purchaseRate);

    if (!salesRate.ok) {
      toast.error(`Sales rate: ${salesRate.message}`);
      return;
    }

    if (!purchaseRate.ok) {
      toast.error(`Purchase rate: ${purchaseRate.message}`);
      return;
    }

    try {
      await createItem.mutateAsync({
        description: form.description,
        expenseAccountId: form.expenseAccountId || null,
        kind: form.kind,
        name: form.name,
        orgSlug,
        purchaseRateMinor: purchaseRate.value,
        salesAccountId: form.salesAccountId || null,
        salesRateMinor: salesRate.value,
        unit: form.unit,
        usage: form.usage
      });
      setForm(initialItemForm);
      toast.success("Item saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item.");
    }
  }

  async function toggleItemActive(item: Item) {
    try {
      await setItemActive.mutateAsync({
        id: item.id,
        isActive: !item.isActive,
        orgSlug
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BoxesIcon className="size-4" />
          Records
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Items</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Goods and services with sales or purchase defaults. Stock movement stays out of Phase 2.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Create item</CardTitle>
            <CardDescription>
              Use account defaults to speed up later document posting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" noValidate onSubmit={submitItem}>
              <FieldGroup className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Kind"
                    name="item-kind"
                    onValueChange={(value) =>
                      setForm((current) => {
                        return { ...current, kind: value as ItemKind };
                      })
                    }
                    options={itemKinds}
                    value={form.kind}
                  />
                  <SelectField
                    label="Usage"
                    name="item-usage"
                    onValueChange={(value) =>
                      setForm((current) => {
                        return { ...current, usage: value as ItemUsage };
                      })
                    }
                    options={itemUsages}
                    value={form.usage}
                  />
                </div>
                <TextInput
                  label="Name"
                  name="item-name"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, name: value };
                    })
                  }
                  placeholder="Consulting service"
                  required
                  value={form.name}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Unit"
                    name="item-unit"
                    onChange={(value) =>
                      setForm((current) => {
                        return { ...current, unit: value };
                      })
                    }
                    placeholder="nos"
                    value={form.unit}
                  />
                  <TextInput
                    inputMode="decimal"
                    label="Sales rate"
                    name="item-sales-rate"
                    onChange={(value) =>
                      setForm((current) => {
                        return { ...current, salesRate: value };
                      })
                    }
                    placeholder="0.00"
                    value={form.salesRate}
                  />
                </div>
                <TextInput
                  inputMode="decimal"
                  label="Purchase rate"
                  name="item-purchase-rate"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, purchaseRate: value };
                    })
                  }
                  placeholder="0.00"
                  value={form.purchaseRate}
                />
                <Field>
                  <FieldLabel>Sales account</FieldLabel>
                  <AccountSearchSelect
                    accounts={accounts}
                    aria-label="Sales account"
                    onValueChange={(accountId) =>
                      setForm((current) => {
                        return { ...current, salesAccountId: accountId };
                      })
                    }
                    value={form.salesAccountId}
                  />
                </Field>
                <Field>
                  <FieldLabel>Expense account</FieldLabel>
                  <AccountSearchSelect
                    accounts={accounts}
                    aria-label="Expense account"
                    onValueChange={(accountId) =>
                      setForm((current) => {
                        return { ...current, expenseAccountId: accountId };
                      })
                    }
                    value={form.expenseAccountId}
                  />
                </Field>
                <TextInput
                  label="Description"
                  name="item-description"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, description: value };
                    })
                  }
                  placeholder="Optional"
                  value={form.description}
                />
              </FieldGroup>
              <Button disabled={createItem.isPending} type="submit">
                {createItem.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Add item
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Item register</CardTitle>
                <CardDescription>
                  Inactive items stay available for historical documents.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-[130px_150px_minmax(180px,260px)]">
                <Select
                  items={[{ label: "All", value: "all" }, ...itemKinds]}
                  name="item-kind-filter"
                  onValueChange={(value) => setKind(value as ItemKind | "all")}
                  value={kind}
                >
                  <SelectTrigger aria-label="Item kind filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      {itemKinds.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  items={[{ label: "All", value: "all" }, ...itemUsages]}
                  name="item-usage-filter"
                  onValueChange={(value) => setUsage(value as ItemUsage | "all")}
                  value={usage}
                >
                  <SelectTrigger aria-label="Item usage filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All usage</SelectItem>
                      {itemUsages.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
                  <Input
                    aria-label="Search items"
                    className="pl-8"
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search items"
                    value={query}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderItemTable(itemsQuery, items, toggleItemActive)}</CardContent>
        </Card>
      </div>
    </main>
  );
}

function renderItemTable(
  query: ReturnType<typeof useItemsQuery>,
  items: Item[],
  toggleItemActive: (item: Item) => void
) {
  if (query.isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">Could not load items</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Item read failed."}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BoxesIcon />
          </EmptyMedia>
          <EmptyTitle>No items</EmptyTitle>
          <EmptyDescription>Add the first good or service.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Sales rate</TableHead>
            <TableHead className="text-right">Purchase rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="capitalize">{item.kind}</TableCell>
              <TableCell className="capitalize">{item.usage}</TableCell>
              <TableCell>{item.unit ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {item.salesRateMinor ? formatMinorUnits(item.salesRateMinor) : "-"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.purchaseRateMinor ? formatMinorUnits(item.purchaseRateMinor) : "-"}
              </TableCell>
              <TableCell>
                {item.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge>Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  onClick={() => toggleItemActive(item)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {item.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SelectField({
  label,
  name,
  onValueChange,
  options,
  value
}: {
  label: string;
  name: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select
        items={options}
        name={name}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        value={value}
      >
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function TextInput({
  label,
  name,
  onChange,
  value,
  ...inputProps
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<ComponentProps<typeof Input>, "onChange" | "value">) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
        {...inputProps}
      />
    </Field>
  );
}
