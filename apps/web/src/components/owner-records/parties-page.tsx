import { PlusIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { type ComponentProps, type FormEvent, useState } from "react";
import { toast } from "sonner";

import { type Party, type PartyKind } from "@tsu-stack/core/parties";
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

import {
  useCreatePartyMutation,
  usePartiesQuery,
  useSetPartyActiveMutation
} from "@/hooks/use-owner-records";

type PartiesPageProps = {
  orgSlug: string;
};

type PartyFormState = {
  city: string;
  countryCode: string;
  displayName: string;
  email: string;
  kind: PartyKind;
  phone: string;
};

const partyKinds: Array<{ label: string; value: PartyKind }> = [
  { label: "Customer", value: "customer" },
  { label: "Vendor", value: "vendor" },
  { label: "Both", value: "both" }
];

const initialPartyForm: PartyFormState = {
  city: "",
  countryCode: "IN",
  displayName: "",
  email: "",
  kind: "customer",
  phone: ""
};

export function PartiesPage({ orgSlug }: PartiesPageProps) {
  const [kind, setKind] = useState<PartyKind | "all">("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PartyFormState>(initialPartyForm);
  const partiesQuery = usePartiesQuery({
    includeInactive: true,
    kind: kind === "all" ? undefined : kind,
    orgSlug,
    q: query.trim() || undefined
  });
  const createParty = useCreatePartyMutation();
  const setPartyActive = useSetPartyActiveMutation();
  const parties = partiesQuery.data?.parties ?? [];

  async function submitParty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createParty.mutateAsync({
        city: form.city,
        countryCode: form.countryCode,
        displayName: form.displayName,
        email: form.email,
        kind: form.kind,
        orgSlug,
        phone: form.phone
      });
      setForm(initialPartyForm);
      toast.success("Party saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save party.");
    }
  }

  async function togglePartyActive(party: Party) {
    try {
      await setPartyActive.mutateAsync({
        id: party.id,
        isActive: !party.isActive,
        orgSlug
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update party.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <UserRoundIcon className="size-4" />
          Records
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Parties</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Customers, vendors, and shared party records used by sales and purchase workflows.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Create party</CardTitle>
            <CardDescription>
              Keep one record when a contact is both customer and vendor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" noValidate onSubmit={submitParty}>
              <FieldGroup className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="party-kind">Kind</FieldLabel>
                  <Select
                    items={partyKinds}
                    name="party-kind"
                    onValueChange={(value) =>
                      setForm((current) => {
                        return { ...current, kind: value as PartyKind };
                      })
                    }
                    value={form.kind}
                  >
                    <SelectTrigger id="party-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {partyKinds.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <TextInput
                  label="Display name"
                  name="party-display-name"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, displayName: value };
                    })
                  }
                  placeholder="Acme Traders"
                  required
                  value={form.displayName}
                />
                <TextInput
                  label="Email"
                  name="party-email"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, email: value };
                    })
                  }
                  placeholder="billing@example.com"
                  type="email"
                  value={form.email}
                />
                <TextInput
                  label="Phone"
                  name="party-phone"
                  onChange={(value) =>
                    setForm((current) => {
                      return { ...current, phone: value };
                    })
                  }
                  placeholder="+91 98765 43210"
                  value={form.phone}
                />
                <div className="grid gap-4 sm:grid-cols-[1fr_88px]">
                  <TextInput
                    label="City"
                    name="party-city"
                    onChange={(value) =>
                      setForm((current) => {
                        return { ...current, city: value };
                      })
                    }
                    placeholder="Bengaluru"
                    value={form.city}
                  />
                  <TextInput
                    label="Country"
                    maxLength={2}
                    name="party-country"
                    onChange={(value) =>
                      setForm((current) => {
                        return { ...current, countryCode: value.toUpperCase() };
                      })
                    }
                    placeholder="IN"
                    value={form.countryCode}
                  />
                </div>
              </FieldGroup>
              <Button disabled={createParty.isPending} type="submit">
                {createParty.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Add party
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Party register</CardTitle>
                <CardDescription>
                  Inactive records stay available for historical documents.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-[150px_minmax(180px,260px)]">
                <Select
                  items={[{ label: "All", value: "all" }, ...partyKinds]}
                  name="party-filter"
                  onValueChange={(value) => setKind(value as PartyKind | "all")}
                  value={kind}
                >
                  <SelectTrigger aria-label="Party kind filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      {partyKinds.map((option) => (
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
                    aria-label="Search parties"
                    className="pl-8"
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search parties"
                    value={query}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderPartyTable(partiesQuery, parties, togglePartyActive)}</CardContent>
        </Card>
      </div>
    </main>
  );
}

function renderPartyTable(
  query: ReturnType<typeof usePartiesQuery>,
  parties: Party[],
  togglePartyActive: (party: Party) => void
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
        <h2 className="text-sm font-medium text-destructive">Could not load parties</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Party read failed."}
        </p>
      </div>
    );
  }

  if (parties.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRoundIcon />
          </EmptyMedia>
          <EmptyTitle>No parties</EmptyTitle>
          <EmptyDescription>Add the first customer or vendor record.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {parties.map((party) => (
            <TableRow key={party.id}>
              <TableCell className="font-medium">{party.displayName}</TableCell>
              <TableCell className="capitalize">{party.kind}</TableCell>
              <TableCell>{party.email ?? "-"}</TableCell>
              <TableCell>{party.phone ?? "-"}</TableCell>
              <TableCell>{party.city ?? "-"}</TableCell>
              <TableCell>
                {party.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge>Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  onClick={() => togglePartyActive(party)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {party.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
