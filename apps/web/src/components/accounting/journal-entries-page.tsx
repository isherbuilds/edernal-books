import { useQuery } from "@tanstack/react-query";
import { MoreHorizontalIcon, PlusIcon, RotateCcwIcon, Rows3Icon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { formatMinorUnits, getTodayDateString } from "@/utils/accounting-format";

import {
  useChartAccountsQuery,
  usePostJournalEntryMutation,
  useReverseJournalEntryMutation
} from "@/hooks/use-accounting";

import { JournalEntryForm } from "@/components/accounting/journal-entry-form";

type JournalEntriesPageProps = {
  orgSlug: string;
};

type JournalEntryMode = "manual" | "opening-balance";

export function JournalEntriesPage({ orgSlug }: JournalEntriesPageProps) {
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const entriesQuery = useQuery(
    orpc.accounting.journalEntries.list.queryOptions({
      input: {
        orgSlug
      }
    })
  );
  const postJournal = usePostJournalEntryMutation(orgSlug);
  const reverseJournal = useReverseJournalEntryMutation(orgSlug);
  const [message, setMessage] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<JournalEntryMode | null>(null);
  const [reversingEntryId, setReversingEntryId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const accounts = accountsQuery.data?.accounts ?? [];
  const entries = entriesQuery.data?.entries ?? [];
  const reversingEntry = entries.find((entry) => entry.id === reversingEntryId);

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Rows3Icon className="size-4" />
            Accounting
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">Journal entries</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Post balanced journals and reverse posted entries.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEntryMode("opening-balance")} type="button" variant="outline">
            Opening balances
          </Button>
          <Button onClick={() => setEntryMode("manual")} type="button">
            <PlusIcon data-icon="inline-start" />
            New journal
          </Button>
        </div>
      </div>

      {message ? (
        <div className="border bg-card px-3 py-2 text-sm text-muted-foreground">{message}</div>
      ) : null}

      {entriesQuery.isLoading ? (
        <div className="flex min-h-72 items-center justify-center border">
          <Spinner />
        </div>
      ) : entriesQuery.isError ? (
        <ErrorBlock error={entriesQuery.error} title="Could not load journals" />
      ) : entries.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Rows3Icon />
            </EmptyMedia>
            <EmptyTitle>No journal entries</EmptyTitle>
            <EmptyDescription>Post a manual or opening-balance journal.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto border bg-background">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="tabular-nums">{entry.postingDate}</TableCell>
                  <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                  <TableCell>{entry.description ?? "No description"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinorUnits(entry.totalMinor)}
                  </TableCell>
                  <TableCell>
                    {entry.reversalOfEntryId ? (
                      <Badge variant="outline">Reversal</Badge>
                    ) : (
                      <Badge variant="secondary">Posted</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button aria-label="Journal actions" size="icon-sm" variant="ghost" />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={Boolean(entry.reversalOfEntryId)}
                          onClick={() => {
                            setReversalReason("");
                            setReversingEntryId(entry.id);
                          }}
                        >
                          <RotateCcwIcon />
                          Reverse
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={entryMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEntryMode(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[680px]">
          <SheetHeader>
            <SheetTitle>
              {entryMode === "opening-balance" ? "Opening balances" : "New journal"}
            </SheetTitle>
            <SheetDescription>
              {entryMode === "opening-balance"
                ? "Enter opening balances as a normal balanced journal."
                : "Enter at least two lines with equal debit and credit totals."}
            </SheetDescription>
          </SheetHeader>

          <div className="h-full overflow-y-auto px-6 pb-24">
            {accountsQuery.isLoading ? (
              <div className="flex min-h-72 items-center justify-center">
                <Spinner />
              </div>
            ) : accountsQuery.isError ? (
              <ErrorBlock error={accountsQuery.error} title="Could not load accounts" />
            ) : entryMode ? (
              <JournalEntryForm
                accounts={accounts}
                mode={entryMode}
                onSubmit={(input) => {
                  setMessage(null);
                  return postJournal.mutateAsync({ ...input, orgSlug }).then(
                    (result) => {
                      setMessage(`Journal posted as ${result.entryNumber}.`);
                      setEntryMode(null);
                      return true;
                    },
                    (error) => {
                      setMessage(
                        error instanceof Error ? error.message : "Journal posting failed."
                      );
                      return false;
                    }
                  );
                }}
                pending={postJournal.isPending}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(reversingEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setReversingEntryId(null);
            setReversalReason("");
          }
        }}
      >
        <SheetContent className="sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Reverse journal</SheetTitle>
            <SheetDescription>
              {reversingEntry
                ? `Create a reversal for ${reversingEntry.entryNumber}.`
                : "Create a reversing entry."}
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-1 flex-col px-6" onSubmit={submitReversal}>
            <Input
              onChange={(event) => setReversalReason(event.currentTarget.value)}
              placeholder="Reason"
              value={reversalReason}
            />

            <SheetFooter className="-mx-6 mt-auto">
              <Button disabled={reverseJournal.isPending} type="submit">
                <RotateCcwIcon data-icon="inline-start" />
                Reverse
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  );

  function submitReversal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reversingEntry) {
      return;
    }

    const reason = reversalReason.trim();

    if (!reason) {
      setMessage("Enter a reversal reason.");
      return;
    }

    reverseJournal.mutate(
      {
        description: reason,
        journalEntryId: reversingEntry.id,
        operationKey: `reversal-${reversingEntry.id}`,
        orgSlug,
        postingDate: getTodayDateString()
      },
      {
        onError: (error) => {
          setMessage(error instanceof Error ? error.message : "Reversal failed.");
        },
        onSuccess: (result) => {
          setMessage(`Reversal posted as ${result.entryNumber}.`);
          setReversalReason("");
          setReversingEntryId(null);
        }
      }
    );
  }
}

function ErrorBlock({ error, title }: { error: unknown; title: string }) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="text-sm font-medium text-destructive">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Accounting request failed."}
      </p>
    </div>
  );
}
