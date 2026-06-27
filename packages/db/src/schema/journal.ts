import { sql } from "drizzle-orm";
import {
  bigint as pgBigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { ledgerAccount } from "#@/schema/accounts";
import { organization, user } from "#@/schema/auth.schema";
import { accountingPeriod } from "#@/schema/periods";
import { sourceDocument } from "#@/schema/source-documents";
import { createUuidV7 } from "#@/utils/id";

export const journalEntry = pgTable(
  "journal_entry",
  {
    accountingPeriodId: uuid("accounting_period_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    entryNumber: text("entry_number").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    operationKey: text("operation_key").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    postedAt: timestamp("posted_at").notNull(),
    postedBy: text("posted_by").references(() => user.id, { onDelete: "set null" }),
    postingDate: date("posting_date").notNull(),
    requestHash: text("request_hash").notNull(),
    reversalOfEntryId: uuid("reversal_of_entry_id"),
    sourceDocumentId: uuid("source_document_id"),
    totalMinor: pgBigint("total_minor", { mode: "bigint" }).notNull()
  },
  (table) => [
    uniqueIndex("journal_entry_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("journal_entry_organization_id_operation_key_uidx").on(
      table.organizationId,
      table.operationKey
    ),
    uniqueIndex("journal_entry_organization_id_entry_number_uidx").on(
      table.organizationId,
      table.entryNumber
    ),
    uniqueIndex("journal_entry_one_reversal_per_original_uidx")
      .on(table.organizationId, table.reversalOfEntryId)
      .where(sql`${table.reversalOfEntryId} IS NOT NULL`),
    index("journal_entry_posted_date_idx").on(table.organizationId, table.postingDate, table.id),
    index("journal_entry_organization_id_idx").on(table.organizationId),
    foreignKey({
      columns: [table.organizationId, table.accountingPeriodId],
      foreignColumns: [accountingPeriod.organizationId, accountingPeriod.id],
      name: "journal_entry_organization_id_accounting_period_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.sourceDocumentId],
      foreignColumns: [sourceDocument.organizationId, sourceDocument.id],
      name: "journal_entry_organization_id_source_document_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.reversalOfEntryId],
      foreignColumns: [table.organizationId, table.id],
      name: "journal_entry_organization_id_reversal_of_entry_id_fkey"
    }).onDelete("restrict"),
    check(
      "journal_entry_reversal_not_self_ck",
      sql`${table.reversalOfEntryId} IS NULL OR ${table.reversalOfEntryId} <> ${table.id}`
    ),
    check("journal_entry_total_minor_ck", sql`${table.totalMinor} > 0`)
  ]
);

export const journalLine = pgTable(
  "journal_line",
  {
    accountId: uuid("account_id").notNull(),
    creditMinor: pgBigint("credit_minor", { mode: "bigint" }).notNull(),
    debitMinor: pgBigint("debit_minor", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    journalEntryId: uuid("journal_entry_id").notNull(),
    lineNumber: integer("line_number").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" })
  },
  (table) => [
    uniqueIndex("journal_line_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("journal_line_organization_id_journal_entry_id_line_number_uidx").on(
      table.organizationId,
      table.journalEntryId,
      table.lineNumber
    ),
    index("journal_line_organization_id_idx").on(table.organizationId),
    index("journal_line_account_ledger_idx").on(
      table.organizationId,
      table.accountId,
      table.journalEntryId,
      table.lineNumber
    ),
    foreignKey({
      columns: [table.organizationId, table.journalEntryId],
      foreignColumns: [journalEntry.organizationId, journalEntry.id],
      name: "journal_line_organization_id_journal_entry_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.accountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "journal_line_organization_id_account_id_fkey"
    }).onDelete("restrict"),
    check("journal_line_line_number_ck", sql`${table.lineNumber} > 0`),
    check("journal_line_debit_ck", sql`${table.debitMinor} >= 0`),
    check("journal_line_credit_ck", sql`${table.creditMinor} >= 0`),
    check(
      "journal_line_one_sided_ck",
      sql`(${table.debitMinor} > 0 AND ${table.creditMinor} = 0) OR (${table.debitMinor} = 0 AND ${table.creditMinor} > 0)`
    )
  ]
);
