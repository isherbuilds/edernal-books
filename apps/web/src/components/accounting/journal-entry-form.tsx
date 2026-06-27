import { PlusIcon, Trash2Icon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { type LedgerAccountListItem } from "@tsu-stack/core/accounting";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
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

import { AccountSearchSelect } from "@/components/accounting/account-search-select";

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
  operationKey: string;
  postingDate: string;
};

type JournalEntrySubmitLine = {
  accountId: string;
  amountMinor: string;
  description?: string;
  side: "credit" | "debit";
};

export function JournalEntryForm({ accounts, mode, onSubmit, pending }: JournalEntryFormProps) {
  const [postingDate, setPostingDate] = useState(getTodayDateString());
  const [description, setDescription] = useState(
    mode === "opening-balance" ? "Opening balance journal" : ""
  );
  const [operationKey, setOperationKey] = useState(createOperationKey(mode));
  const [confirmedDifferenceAccount, setConfirmedDifferenceAccount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lines, setLines] = useState<JournalLineFormValue[]>([
    createLineFormValue(),
    createLineFormValue()
  ]);
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
  const usesDifferenceAccount = Boolean(
    differenceAccount && lines.some((line) => line.accountId === differenceAccount.id)
  );

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (usesDifferenceAccount && !confirmedDifferenceAccount) {
      setMessage("Confirm Opening Balance Difference use before posting.");
      return;
    }

    const entryLines: JournalEntrySubmitLine[] = [];
    let totalDebitMinor = 0n;
    let totalCreditMinor = 0n;

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;
      const debitMinor = parseDecimalAmountToMinorUnits(line.debitAmount);
      const creditMinor = parseDecimalAmountToMinorUnits(line.creditAmount);

      if (!debitMinor.ok) {
        setMessage(`Line ${lineNumber} debit: ${debitMinor.message}`);
        return;
      }

      if (!creditMinor.ok) {
        setMessage(`Line ${lineNumber} credit: ${creditMinor.message}`);
        return;
      }

      if (!line.accountId) {
        if (debitMinor.value || creditMinor.value) {
          setMessage(`Line ${lineNumber}: select an account for the entered amount.`);
          return;
        }

        continue;
      }

      if (debitMinor.value && creditMinor.value) {
        setMessage("A line can have debit or credit, not both.");
        return;
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

    if (entryLines.length < 2) {
      setMessage("Add at least two lines with accounts and amounts.");
      return;
    }

    if (totalDebitMinor !== totalCreditMinor) {
      setMessage("Total debit must equal total credit before posting.");
      return;
    }

    const posted = await onSubmit({
      description: description.trim(),
      lines: entryLines,
      operationKey: operationKey.trim(),
      postingDate
    });

    if (posted) {
      setOperationKey(createOperationKey(mode));
    }
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submitEntry}>
      <FieldGroup className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor={`${mode}-posting-date`}>Posting date</FieldLabel>
          <Input
            id={`${mode}-posting-date`}
            onChange={(event) => setPostingDate(event.currentTarget.value)}
            required
            type="date"
            value={postingDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${mode}-description`}>Description</FieldLabel>
          <Input
            id={`${mode}-description`}
            onChange={(event) => setDescription(event.currentTarget.value)}
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
              <AccountSearchSelect
                accounts={postableAccounts}
                aria-label={`Line ${index + 1} account`}
                onValueChange={(accountId) => updateLine(index, { accountId })}
                value={line.accountId}
              />
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
                onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
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
            onCheckedChange={(checked) => setConfirmedDifferenceAccount(checked === true)}
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
          onClick={() => setLines((current) => [...current, createLineFormValue()])}
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

  function updateLine(index: number, patch: Partial<JournalLineFormValue>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }
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

function createOperationKey(mode: "manual" | "opening-balance"): string {
  return `${mode}-${crypto.randomUUID()}`;
}
