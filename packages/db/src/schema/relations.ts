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
import { journalEntry, journalLine } from "#@/schema/journal";
import { currency, exchangeRate, organizationSetting } from "#@/schema/organization";
import { outboxEvent } from "#@/schema/outbox";
import { accountingPeriod, fiscalYear } from "#@/schema/periods";
import { sourceDocument } from "#@/schema/source-documents";

const schema = {
  account,
  auditEvent,
  accountingPeriod,
  currency,
  exchangeRate,
  fiscalYear,
  invitation,
  journalEntry,
  journalLine,
  ledgerAccount,
  member,
  numberSequence,
  organization,
  organizationSetting,
  outboxEvent,
  session,
  sourceDocument,
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
    sourceDocument: {
      journalEntries: r.many.journalEntry(),
      organization: r.one.organization({
        from: r.sourceDocument.organizationId,
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
      }),
      sourceDocument: r.one.sourceDocument({
        from: r.journalEntry.sourceDocumentId,
        to: r.sourceDocument.id
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
    outboxEvent: {
      organization: r.one.organization({
        from: r.outboxEvent.organizationId,
        to: r.organization.id
      })
    }
  };
});
