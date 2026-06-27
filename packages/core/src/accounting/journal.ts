export type JournalDraftLine = {
  accountId: string;
  creditMinor: bigint;
  debitMinor: bigint;
};

export type JournalEntryDraft = {
  lines: JournalDraftLine[];
};

export type JournalValidationResult =
  | { ok: true }
  | {
      errorCode:
        | "JOURNAL_ENTRY_NEEDS_TWO_LINES"
        | "JOURNAL_ENTRY_NOT_BALANCED"
        | "JOURNAL_ENTRY_LINE_HAS_DEBIT_AND_CREDIT"
        | "JOURNAL_ENTRY_LINE_HAS_NO_AMOUNT"
        | "JOURNAL_ENTRY_LINE_NEGATIVE_AMOUNT";
      ok: false;
    };

export function validateJournalEntryDraft(draft: JournalEntryDraft): JournalValidationResult {
  if (draft.lines.length < 2) {
    return { errorCode: "JOURNAL_ENTRY_NEEDS_TWO_LINES", ok: false };
  }

  let totalDebit = 0n;
  let totalCredit = 0n;

  for (const line of draft.lines) {
    if (line.debitMinor < 0n || line.creditMinor < 0n) {
      return { errorCode: "JOURNAL_ENTRY_LINE_NEGATIVE_AMOUNT", ok: false };
    }

    if (line.debitMinor > 0n && line.creditMinor > 0n) {
      return { errorCode: "JOURNAL_ENTRY_LINE_HAS_DEBIT_AND_CREDIT", ok: false };
    }

    if (line.debitMinor === 0n && line.creditMinor === 0n) {
      return { errorCode: "JOURNAL_ENTRY_LINE_HAS_NO_AMOUNT", ok: false };
    }

    totalDebit += line.debitMinor;
    totalCredit += line.creditMinor;
  }

  if (totalDebit !== totalCredit) {
    return { errorCode: "JOURNAL_ENTRY_NOT_BALANCED", ok: false };
  }

  return { ok: true };
}
