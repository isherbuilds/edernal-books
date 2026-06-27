import { describe, expect, it } from "vite-plus/test";

import { type JournalDraftLine, validateJournalEntryDraft } from "#@/accounting/journal";

describe("journal entry validation", () => {
  it("accepts balanced entry", () => {
    const result = validateJournalEntryDraft({
      lines: [
        makeLine({ accountId: "cash", debitMinor: 10000n }),
        makeLine({ accountId: "capital", creditMinor: 10000n })
      ]
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects unbalanced entry", () => {
    const result = validateJournalEntryDraft({
      lines: [
        makeLine({ accountId: "cash", debitMinor: 9000n }),
        makeLine({ accountId: "capital", creditMinor: 10000n })
      ]
    });

    expect(result).toEqual({ errorCode: "JOURNAL_ENTRY_NOT_BALANCED", ok: false });
  });

  it("rejects invalid line amounts", () => {
    expect(
      validateJournalEntryDraft({
        lines: [
          makeLine({ accountId: "cash", creditMinor: 1n, debitMinor: 1n }),
          makeLine({ accountId: "capital", creditMinor: 1n })
        ]
      })
    ).toEqual({ errorCode: "JOURNAL_ENTRY_LINE_HAS_DEBIT_AND_CREDIT", ok: false });

    expect(
      validateJournalEntryDraft({
        lines: [
          makeLine({ accountId: "cash" }),
          makeLine({ accountId: "capital", creditMinor: 1n })
        ]
      })
    ).toEqual({ errorCode: "JOURNAL_ENTRY_LINE_HAS_NO_AMOUNT", ok: false });
  });
});

function makeLine(input: {
  accountId: string;
  creditMinor?: bigint;
  debitMinor?: bigint;
}): JournalDraftLine {
  return {
    accountId: input.accountId,
    creditMinor: input.creditMinor ?? 0n,
    debitMinor: input.debitMinor ?? 0n
  };
}
