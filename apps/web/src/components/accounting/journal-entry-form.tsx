import { PlusIcon, Trash2Icon } from "lucide-react";
import { type FormEvent, useReducer } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { Combobox } from "@tsu-stack/ui/components/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Separator } from "@tsu-stack/ui/components/separator";

import { getTodayDateString, parseDecimalAmountToMinorUnits } from "@/utils/accounting-format";

import {
  renderAccountComboboxOption,
  toAccountComboboxOption
} from "@/components/accounting/account-combobox-option";

type JournalLineFormValue = {
  accountId: string;
  creditAmount: string;
  debitAmount: string;
  description: string;
  id: string;
};

type JournalEntryFormProps = {
  accounts: LedgerAccountListItem[];
  mode: "manual" | "opening-balance";
  onSubmit: (input: JournalEntrySubmitInput) => Promise<boolean>;
  pending: boolean;
};

type JournalEntrySubmitInput = {
  description: string;
  lines: JournalEntrySubmitLine[];
  postingDate: string;
};

type JournalEntrySubmitLine = {
  accountId: string;
  amountMinor: string;
  description?: string;
  side: "credit" | "debit";
};

type JournalEntryFormState = {
  confirmedDifferenceAccount: boolean;
  description: string;
  lines: JournalLineFormValue[];
  message: string | null;
  postingDate: string;
};

type JournalEntryFormAction =
  | { type: "addLine"; line: JournalLineFormValue }
  | { type: "descriptionChanged"; value: string }
  | { differenceAccountId: string; enabled: boolean; type: "differenceAccountConfirmationChanged" }
  | { id: string; type: "removeLine" }
  | { type: "messageChanged"; value: string | null }
  | { type: "postingDateChanged"; value: string }
  | { index: number; patch: Partial<JournalLineFormValue>; type: "lineChanged" };

type BuildJournalEntryLinesResult =
  | {
      lines: JournalEntrySubmitLine[];
      ok: true;
      totalCreditMinor: bigint;
      totalDebitMinor: bigint;
    }
  | {
      message: string;
      ok: false;
    };

export function JournalEntryForm({ accounts, mode, onSubmit, pending }: JournalEntryFormProps) {
  const [formState, dispatch] = useReducer(
    journalEntryFormReducer,
    mode,
    createInitialJournalEntryFormState
  );
  const { confirmedDifferenceAccount, description, lines, message, postingDate } = formState;
  const differenceAccount = accounts.find(
    (account) => account.systemKey === "opening_balance_difference"
  );
  const canUseDifferenceAccount = mode === "opening-balance" && confirmedDifferenceAccount === true;
  const postableAccounts = accounts.filter(
    (account) =>
      account.active &&
      !account.isGroup &&
      account.allowManualPosting &&
      (account.systemKey !== "opening_balance_difference" || canUseDifferenceAccount)
  );
  const postableAccountOptions = postableAccounts.map(toAccountComboboxOption);
  const usesDifferenceAccount = Boolean(
    differenceAccount && lines.some((line) => line.accountId === differenceAccount.id)
  );

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "messageChanged", value: null });

    if (usesDifferenceAccount && !confirmedDifferenceAccount) {
      dispatch({
        type: "messageChanged",
        value: "Confirm Opening Balance Difference use before posting."
      });
      return;
    }

    const entryResult = buildJournalEntryLines(lines);

    if (!entryResult.ok) {
      dispatch({ type: "messageChanged", value: entryResult.message });
      return;
    }

    if (entryResult.lines.length < 2) {
      dispatch({
        type: "messageChanged",
        value: "Add at least two lines with accounts and amounts."
      });
      return;
    }

    if (entryResult.totalDebitMinor !== entryResult.totalCreditMinor) {
      dispatch({
        type: "messageChanged",
        value: "Total debit must equal total credit before posting."
      });
      return;
    }

    await onSubmit({
      description: description.trim(),
      lines: entryResult.lines,
      postingDate
    });
  }

  function updateLine(index: number, patch: Partial<JournalLineFormValue>) {
    dispatch({ index, patch, type: "lineChanged" });
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submitEntry}>
      <FieldGroup className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor={`${mode}-posting-date`}>Posting date</FieldLabel>
          <Input
            id={`${mode}-posting-date`}
            onChange={(event) =>
              dispatch({ type: "postingDateChanged", value: event.currentTarget.value })
            }
            required
            type="date"
            value={postingDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${mode}-description`}>Description</FieldLabel>
          <Input
            id={`${mode}-description`}
            onChange={(event) =>
              dispatch({ type: "descriptionChanged", value: event.currentTarget.value })
            }
            placeholder="Journal description"
            value={description}
          />
        </Field>
      </FieldGroup>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <div className="grid min-w-[720px] grid-cols-[minmax(180px,1.4fr)_110px_110px_minmax(160px,1fr)_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>Account</span>
          <span>Debit</span>
          <span>Credit</span>
          <span>Line note</span>
          <span />
        </div>
        <div className="flex flex-col">
          {lines.map((line, index) => (
            <div
              className="grid min-w-[720px] grid-cols-[minmax(180px,1.4fr)_110px_110px_minmax(160px,1fr)_40px] gap-2 border-b px-3 py-2 last:border-b-0"
              key={line.id}
            >
              <div>
                <label className="sr-only" htmlFor={`${mode}-line-${index}-account`}>
                  {`Line ${index + 1} account`}
                </label>
                <Combobox
                  emptyText="No accounts found."
                  id={`${mode}-line-${index}-account`}
                  items={postableAccountOptions}
                  onValueChange={(accountId) => updateLine(index, { accountId: accountId ?? "" })}
                  placeholder="Search account"
                  renderItem={renderAccountComboboxOption}
                  value={line.accountId || null}
                />
              </div>
              <Input
                aria-label={`Line ${index + 1} debit`}
                inputMode="decimal"
                onChange={(event) => updateLine(index, { debitAmount: event.currentTarget.value })}
                placeholder="0.00"
                value={line.debitAmount}
              />
              <Input
                aria-label={`Line ${index + 1} credit`}
                inputMode="decimal"
                onChange={(event) => updateLine(index, { creditAmount: event.currentTarget.value })}
                placeholder="0.00"
                value={line.creditAmount}
              />
              <Input
                aria-label={`Line ${index + 1} note`}
                onChange={(event) => updateLine(index, { description: event.currentTarget.value })}
                placeholder="Optional"
                value={line.description}
              />
              <Button
                disabled={lines.length <= 2}
                onClick={() => dispatch({ id: line.id, type: "removeLine" })}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2Icon data-icon="inline-start" />
                <span className="sr-only">Remove line</span>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {mode === "opening-balance" && differenceAccount ? (
        <Field orientation="horizontal">
          <Checkbox
            checked={confirmedDifferenceAccount}
            onCheckedChange={(checked) => {
              dispatch({
                differenceAccountId: differenceAccount.id,
                enabled: checked === true,
                type: "differenceAccountConfirmationChanged"
              });
            }}
          />
          <FieldContent>
            <FieldLabel>Allow Opening Balance Difference</FieldLabel>
            <FieldDescription>
              Confirm before selecting this account in any manual posting.
            </FieldDescription>
          </FieldContent>
        </Field>
      ) : null}

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          onClick={() => dispatch({ line: createLineFormValue(), type: "addLine" })}
          type="button"
          variant="outline"
        >
          <PlusIcon data-icon="inline-start" />
          Add line
        </Button>
        <Button disabled={pending || postableAccounts.length === 0} type="submit">
          Post journal
        </Button>
      </div>
    </form>
  );
}

function createInitialJournalEntryFormState(
  mode: JournalEntryFormProps["mode"]
): JournalEntryFormState {
  return {
    confirmedDifferenceAccount: false,
    description: mode === "opening-balance" ? "Opening balance journal" : "",
    lines: [createLineFormValue(), createLineFormValue()],
    message: null,
    postingDate: getTodayDateString()
  };
}

function journalEntryFormReducer(
  state: JournalEntryFormState,
  action: JournalEntryFormAction
): JournalEntryFormState {
  switch (action.type) {
    case "addLine":
      return { ...state, lines: [...state.lines, action.line] };
    case "descriptionChanged":
      return { ...state, description: action.value };
    case "differenceAccountConfirmationChanged":
      return {
        ...state,
        confirmedDifferenceAccount: action.enabled,
        lines: action.enabled
          ? state.lines
          : state.lines.map((line) =>
              line.accountId === action.differenceAccountId ? { ...line, accountId: "" } : line
            )
      };
    case "lineChanged":
      return {
        ...state,
        lines: state.lines.map((line, lineIndex) =>
          lineIndex === action.index ? { ...line, ...action.patch } : line
        )
      };
    case "messageChanged":
      return { ...state, message: action.value };
    case "postingDateChanged":
      return { ...state, postingDate: action.value };
    case "removeLine":
      return { ...state, lines: state.lines.filter((line) => line.id !== action.id) };
  }
}

function buildJournalEntryLines(lines: JournalLineFormValue[]): BuildJournalEntryLinesResult {
  const entryLines: JournalEntrySubmitLine[] = [];
  let totalDebitMinor = 0n;
  let totalCreditMinor = 0n;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const debitMinor = parseDecimalAmountToMinorUnits(line.debitAmount);
    const creditMinor = parseDecimalAmountToMinorUnits(line.creditAmount);

    if (!debitMinor.ok) {
      return { message: `Line ${lineNumber} debit: ${debitMinor.message}`, ok: false };
    }

    if (!creditMinor.ok) {
      return { message: `Line ${lineNumber} credit: ${creditMinor.message}`, ok: false };
    }

    if (!line.accountId) {
      if (debitMinor.value || creditMinor.value) {
        return {
          message: `Line ${lineNumber}: select an account for the entered amount.`,
          ok: false
        };
      }

      continue;
    }

    if (debitMinor.value && creditMinor.value) {
      return { message: "A line can have debit or credit, not both.", ok: false };
    }

    if (debitMinor.value) {
      totalDebitMinor += BigInt(debitMinor.value);
      entryLines.push({
        accountId: line.accountId,
        amountMinor: debitMinor.value,
        description: line.description.trim() || undefined,
        side: "debit"
      });
      continue;
    }

    if (creditMinor.value) {
      totalCreditMinor += BigInt(creditMinor.value);
      entryLines.push({
        accountId: line.accountId,
        amountMinor: creditMinor.value,
        description: line.description.trim() || undefined,
        side: "credit"
      });
    }
  }

  return {
    lines: entryLines,
    ok: true,
    totalCreditMinor,
    totalDebitMinor
  };
}

function createLineFormValue(): JournalLineFormValue {
  return {
    accountId: "",
    creditAmount: "",
    debitAmount: "",
    description: "",
    id: crypto.randomUUID()
  };
}
