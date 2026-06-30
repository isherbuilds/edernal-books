import { defineRelations } from "drizzle-orm";

import { ledgerAccount, numberSequence } from "#@/schema/accounts";
import { auditEvent } from "#@/schema/audit";
import {
  account,
  invitation,
  member,
  organization,
  session,
  user,
  verification
} from "#@/schema/auth.schema";
import {
  purchaseDocument,
  purchaseDocumentLine,
  salesDocument,
  salesDocumentLine,
  settlementAllocation,
  settlementDocument
} from "#@/schema/documents";
import { item } from "#@/schema/items";
import { journalEntry, journalLine } from "#@/schema/journal";
import { currency, exchangeRate, organizationSetting } from "#@/schema/organization";
import { outboxEvent } from "#@/schema/outbox";
import { party } from "#@/schema/parties";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";

const schema = {
  account,
  auditEvent,
  accountingPeriod,
  currency,
  exchangeRate,
  fiscalYear,
  invitation,
  item,
  journalEntry,
  journalLine,
  ledgerAccount,
  member,
  numberSequence,
  organization,
  organizationSetting,
  outboxEvent,
  party,
  purchaseDocument,
  purchaseDocumentLine,
  salesDocument,
  salesDocumentLine,
  session,
  settlementAllocation,
  settlementDocument,
  user,
  verification
};

export const relations = defineRelations(schema, (r) => {
  return {
    auditEvent: {
      organization: r.one.organization({
        from: r.auditEvent.organizationId,
        to: r.organization.id
      }),
      user: r.one.user({
        from: r.auditEvent.userId,
        to: r.user.id
      })
    },
    currency: {
      baseExchangeRates: r.many.exchangeRate({
        from: r.currency.code,
        to: r.exchangeRate.baseCurrencyCode
      }),
      organizationSettings: r.many.organizationSetting(),
      quoteExchangeRates: r.many.exchangeRate({
        from: r.currency.code,
        to: r.exchangeRate.quoteCurrencyCode
      })
    },
    exchangeRate: {
      baseCurrency: r.one.currency({
        from: r.exchangeRate.baseCurrencyCode,
        to: r.currency.code
      }),
      quoteCurrency: r.one.currency({
        from: r.exchangeRate.quoteCurrencyCode,
        to: r.currency.code
      })
    },
    fiscalYear: {
      accountingPeriods: r.many.accountingPeriod(),
      organization: r.one.organization({
        from: r.fiscalYear.organizationId,
        to: r.organization.id
      })
    },
    accountingPeriod: {
      fiscalYear: r.one.fiscalYear({
        from: r.accountingPeriod.fiscalYearId,
        to: r.fiscalYear.id
      }),
      journalEntries: r.many.journalEntry(),
      organization: r.one.organization({
        from: r.accountingPeriod.organizationId,
        to: r.organization.id
      })
    },
    item: {
      expenseAccount: r.one.ledgerAccount({
        from: r.item.expenseAccountId,
        to: r.ledgerAccount.id
      }),
      organization: r.one.organization({
        from: r.item.organizationId,
        to: r.organization.id
      }),
      salesAccount: r.one.ledgerAccount({
        from: r.item.salesAccountId,
        to: r.ledgerAccount.id
      })
    },
    ledgerAccount: {
      journalLines: r.many.journalLine(),
      organization: r.one.organization({
        from: r.ledgerAccount.organizationId,
        to: r.organization.id
      }),
      parentAccount: r.one.ledgerAccount({
        from: r.ledgerAccount.parentAccountId,
        to: r.ledgerAccount.id
      })
    },
    numberSequence: {
      fiscalYear: r.one.fiscalYear({
        from: r.numberSequence.fiscalYearId,
        to: r.fiscalYear.id
      }),
      organization: r.one.organization({
        from: r.numberSequence.organizationId,
        to: r.organization.id
      })
    },
    organizationSetting: {
      baseCurrency: r.one.currency({
        from: r.organizationSetting.baseCurrencyCode,
        to: r.currency.code
      }),
      organization: r.one.organization({
        from: r.organizationSetting.organizationId,
        to: r.organization.id
      })
    },
    journalEntry: {
      accountingPeriod: r.one.accountingPeriod({
        from: r.journalEntry.accountingPeriodId,
        to: r.accountingPeriod.id
      }),
      journalLines: r.many.journalLine(),
      organization: r.one.organization({
        from: r.journalEntry.organizationId,
        to: r.organization.id
      }),
      reversalOfEntry: r.one.journalEntry({
        from: r.journalEntry.reversalOfEntryId,
        to: r.journalEntry.id
      })
    },
    journalLine: {
      account: r.one.ledgerAccount({
        from: r.journalLine.accountId,
        to: r.ledgerAccount.id
      }),
      entry: r.one.journalEntry({
        from: r.journalLine.journalEntryId,
        to: r.journalEntry.id
      }),
      organization: r.one.organization({
        from: r.journalLine.organizationId,
        to: r.organization.id
      })
    },
    salesDocument: {
      customer: r.one.party({
        from: r.salesDocument.customerPartyId,
        to: r.party.id
      }),
      journalEntry: r.one.journalEntry({
        from: r.salesDocument.journalEntryId,
        to: r.journalEntry.id
      }),
      lines: r.many.salesDocumentLine(),
      organization: r.one.organization({
        from: r.salesDocument.organizationId,
        to: r.organization.id
      })
    },
    salesDocumentLine: {
      document: r.one.salesDocument({
        from: r.salesDocumentLine.salesDocumentId,
        to: r.salesDocument.id
      }),
      incomeAccount: r.one.ledgerAccount({
        from: r.salesDocumentLine.incomeAccountId,
        to: r.ledgerAccount.id
      }),
      item: r.one.item({
        from: r.salesDocumentLine.itemId,
        to: r.item.id
      }),
      organization: r.one.organization({
        from: r.salesDocumentLine.organizationId,
        to: r.organization.id
      })
    },
    purchaseDocument: {
      journalEntry: r.one.journalEntry({
        from: r.purchaseDocument.journalEntryId,
        to: r.journalEntry.id
      }),
      lines: r.many.purchaseDocumentLine(),
      organization: r.one.organization({
        from: r.purchaseDocument.organizationId,
        to: r.organization.id
      }),
      vendor: r.one.party({
        from: r.purchaseDocument.vendorPartyId,
        to: r.party.id
      })
    },
    purchaseDocumentLine: {
      document: r.one.purchaseDocument({
        from: r.purchaseDocumentLine.purchaseDocumentId,
        to: r.purchaseDocument.id
      }),
      expenseAccount: r.one.ledgerAccount({
        from: r.purchaseDocumentLine.expenseAccountId,
        to: r.ledgerAccount.id
      }),
      item: r.one.item({
        from: r.purchaseDocumentLine.itemId,
        to: r.item.id
      }),
      organization: r.one.organization({
        from: r.purchaseDocumentLine.organizationId,
        to: r.organization.id
      })
    },
    settlementDocument: {
      allocations: r.many.settlementAllocation(),
      cashAccount: r.one.ledgerAccount({
        from: r.settlementDocument.cashAccountId,
        to: r.ledgerAccount.id
      }),
      journalEntry: r.one.journalEntry({
        from: r.settlementDocument.journalEntryId,
        to: r.journalEntry.id
      }),
      organization: r.one.organization({
        from: r.settlementDocument.organizationId,
        to: r.organization.id
      }),
      party: r.one.party({
        from: r.settlementDocument.partyId,
        to: r.party.id
      })
    },
    settlementAllocation: {
      organization: r.one.organization({
        from: r.settlementAllocation.organizationId,
        to: r.organization.id
      }),
      purchaseDocument: r.one.purchaseDocument({
        from: r.settlementAllocation.purchaseDocumentId,
        to: r.purchaseDocument.id
      }),
      salesDocument: r.one.salesDocument({
        from: r.settlementAllocation.salesDocumentId,
        to: r.salesDocument.id
      }),
      settlementDocument: r.one.settlementDocument({
        from: r.settlementAllocation.settlementDocumentId,
        to: r.settlementDocument.id
      })
    },
    outboxEvent: {
      organization: r.one.organization({
        from: r.outboxEvent.organizationId,
        to: r.organization.id
      })
    },
    party: {
      organization: r.one.organization({
        from: r.party.organizationId,
        to: r.organization.id
      })
    }
  };
});
