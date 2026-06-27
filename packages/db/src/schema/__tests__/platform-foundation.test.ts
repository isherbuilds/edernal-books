import { describe, expect, it } from "vite-plus/test";

import {
  accountingPeriod,
  auditEvent,
  currency,
  exchangeRate,
  fiscalYear,
  journalEntry,
  journalLine,
  ledgerAccount,
  numberSequence,
  organizationSetting,
  outboxEvent,
  sourceDocument
} from "#@/schema/index";

describe("platform foundation schema", () => {
  it("keeps tenant scope on app-owned tenant tables", () => {
    expect(organizationSetting.organizationId).toBeDefined();
    expect(auditEvent.organizationId).toBeDefined();
    expect(outboxEvent.organizationId).toBeDefined();
  });

  it("keeps currency global", () => {
    expect("organizationId" in currency).toBe(false);
  });

  it("keeps exchange rates as dated global snapshots", () => {
    expect("organizationId" in exchangeRate).toBe(false);
    expect(exchangeRate.baseCurrencyCode).toBeDefined();
    expect(exchangeRate.quoteCurrencyCode).toBeDefined();
    expect(exchangeRate.rate).toBeDefined();
    expect(exchangeRate.rateDate).toBeDefined();
    expect(exchangeRate.source).toBeDefined();
  });

  it("tenant-scopes accounting kernel tables", () => {
    expect(fiscalYear.organizationId).toBeDefined();
    expect(accountingPeriod.organizationId).toBeDefined();
    expect(ledgerAccount.organizationId).toBeDefined();
    expect(numberSequence.organizationId).toBeDefined();
    expect(sourceDocument.organizationId).toBeDefined();
    expect(journalEntry.organizationId).toBeDefined();
    expect(journalLine.organizationId).toBeDefined();
  });

  it("stores journal money in minor-unit bigint columns", () => {
    expect(journalLine.debitMinor).toBeDefined();
    expect(journalLine.creditMinor).toBeDefined();
    expect("baseDebitMinor" in journalLine).toBe(false);
    expect("baseCreditMinor" in journalLine).toBe(false);
    expect("baseCurrencyCode" in journalLine).toBe(false);
    expect("transactionDebitMinor" in journalLine).toBe(false);
    expect("transactionCreditMinor" in journalLine).toBe(false);
    expect("transactionCurrencyCode" in journalLine).toBe(false);
    expect("exchangeRate" in journalLine).toBe(false);
  });

  it("uses posted journal entries without persisted status", () => {
    expect(journalEntry.postedAt).toBeDefined();
    expect(journalEntry.postedBy).toBeDefined();
    expect(journalEntry.requestHash).toBeDefined();
    expect("status" in journalEntry).toBe(false);
  });

  it("keeps source document as a slim anchor", () => {
    expect(sourceDocument.documentNumber).toBeDefined();
    expect(sourceDocument.type).toBeDefined();
    expect("status" in sourceDocument).toBe(false);
    expect("date" in sourceDocument).toBe(false);
    expect("grandTotalMinor" in sourceDocument).toBe(false);
    expect("currencyCode" in sourceDocument).toBe(false);
    expect("exchangeRate" in sourceDocument).toBe(false);
  });

  it("keeps ledger account hierarchy without separate control/reconcilable/currency flags", () => {
    expect(ledgerAccount.parentAccountId).toBeDefined();
    expect(ledgerAccount.allowManualPosting).toBeDefined();
    expect("isControlAccount" in ledgerAccount).toBe(false);
    expect("isReconcilable" in ledgerAccount).toBe(false);
    expect("currencyCode" in ledgerAccount).toBe(false);
  });
});
