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

import { formatMinorUnits, getTodayDateString } from "@/utils/accounting-format";

import {
  useChartAccountsQuery,
  usePostJournalEntryMutation,
  useReverseJournalEntryMutation
} from "@/hooks/use-accounting";

import { JournalEntryForm } from "@/components/accounting/journal-entry-form";
import { type DataColumn, DataTable, DataTableContainer } from "@/components/data-table";
import { EmptyState, PageHeader, PageLayout } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import { getQueryState } from "@/components/query-state-model";

type JournalEntriesPageProps = {
  orgSlug: string;
};

type JournalEntryMode = "manual" | "opening-balance";

export function JournalEntriesPage({ orgSlug }: JournalEntriesPageProps) {
  const accountsQuery = useChartAccountsQuery(orgSlug);
  const {
    data: entriesData,
    error: entriesError,
    isError: isEntriesError,
    isLoading: isEntriesLoading
  } = useQuery(
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
  const entries = entriesData?.entries ?? [];
  const reversingEntry = entries.find((entry) => entry.id === reversingEntryId);

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

  const columns: DataColumn<(typeof entries)[number]>[] = [
    {
      cell: (entry) => entry.postingDate,
      cellClassName: "tabular-nums",
      header: "Date",
      id: "date"
    },
    {
      cell: (entry) => entry.entryNumber,
      cellClassName: "font-medium",
      header: "Number",
      id: "number"
    },
    {
      cell: (entry) => entry.description ?? "No description",
      header: "Description",
      id: "description"
    },
    {
      align: "right",
      cell: (entry) => formatMinorUnits(entry.totalMinor),
      cellClassName: "font-amount tabular-nums",
      header: "Amount",
      id: "amount"
    },
    {
      cell: (entry) =>
        entry.reversalOfEntryId ? (
          <Badge variant="outline">Reversal</Badge>
        ) : (
          <Badge variant="secondary">Posted</Badge>
        ),
      header: "State",
      id: "state"
    },
    {
      align: "right",
      cell: (entry) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button aria-label="Journal actions" size="icon-sm" variant="ghost" />}
          >
            <MoreHorizontalIcon className="size-4" />
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
      ),
      header: <span className="sr-only">Actions</span>,
      headClassName: "w-12",
      id: "actions",
      stopRowClick: true
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        actions={
          <>
            <Button onClick={() => setEntryMode("opening-balance")} type="button" variant="outline">
              Opening balances
            </Button>
            <Button onClick={() => setEntryMode("manual")} type="button">
              <PlusIcon data-icon="inline-start" />
              New journal
            </Button>
          </>
        }
        description="Post balanced journals and reverse posted entries. Posted entries are immutable — correct them with a reversal."
        title="Journal entries"
      />

      {message ? (
        <div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <QueryState
        empty={
          <EmptyState
            description="Post a manual or opening-balance journal."
            icon={<Rows3Icon className="size-5" />}
            title="No journal entries"
          />
        }
        errorFallback="Accounting request failed."
        errorTitle="Could not load journals"
        state={getQueryState({
          empty: entries.length === 0,
          error: entriesError,
          errored: isEntriesError,
          loading: isEntriesLoading
        })}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(entry) => entry.id}
            minWidthClassName="min-w-[920px]"
            rows={entries}
          />
        </DataTableContainer>
      </QueryState>

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
    </PageLayout>
  );
}

function ErrorBlock({ error, title }: { error: unknown; title: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="text-sm font-medium text-destructive">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Accounting request failed."}
      </p>
    </div>
  );
}
