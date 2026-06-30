import { sql, type SQLWrapper } from "drizzle-orm";
import {
  bigint as pgBigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import {
  ALLOCATABLE_DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  PAYMENT_MODES,
  PURCHASE_DOCUMENT_KINDS,
  SETTLEMENT_DIRECTIONS
} from "@tsu-stack/core/documents";

import { ledgerAccount } from "#@/schema/accounts";
import { organization } from "#@/schema/auth.schema";
import { item } from "#@/schema/items";
import { journalEntry } from "#@/schema/journal";
import { party } from "#@/schema/parties";
import { createUuidV7 } from "#@/utils/id";
import { sqlInList } from "#@/utils/sql";

function documentLifecycleColumns() {
  return {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    documentNumber: text("document_number"),
    draftReference: text("draft_reference").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    journalEntryId: uuid("journal_entry_id"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    postedAt: timestamp("posted_at"),
    postedByUserId: text("posted_by_user_id"),
    status: text("status", { enum: DOCUMENT_STATUSES }).default("draft").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    voidReason: text("void_reason"),
    voidedAt: timestamp("voided_at"),
    voidedByUserId: text("voided_by_user_id")
  };
}

type DocumentLifecycleCheckColumns = {
  documentNumber: SQLWrapper;
  journalEntryId: SQLWrapper;
  postedAt: SQLWrapper;
  postedByUserId: SQLWrapper;
  status: SQLWrapper;
  voidReason: SQLWrapper;
  voidedAt: SQLWrapper;
  voidedByUserId: SQLWrapper;
};

function documentLifecycleCheck(table: DocumentLifecycleCheckColumns) {
  return sql`
    (
      ${table.status} = 'draft'
      AND ${table.documentNumber} IS NULL
      AND ${table.journalEntryId} IS NULL
      AND ${table.postedAt} IS NULL
      AND ${table.postedByUserId} IS NULL
      AND ${table.voidedAt} IS NULL
      AND ${table.voidedByUserId} IS NULL
      AND ${table.voidReason} IS NULL
    )
    OR (
      ${table.status} = 'posted'
      AND ${table.documentNumber} IS NOT NULL
      AND ${table.journalEntryId} IS NOT NULL
      AND ${table.postedAt} IS NOT NULL
      AND ${table.postedByUserId} IS NOT NULL
      AND ${table.voidedAt} IS NULL
      AND ${table.voidedByUserId} IS NULL
      AND ${table.voidReason} IS NULL
    )
    OR (
      ${table.status} = 'voided'
      AND ${table.documentNumber} IS NOT NULL
      AND ${table.journalEntryId} IS NOT NULL
      AND ${table.postedAt} IS NOT NULL
      AND ${table.postedByUserId} IS NOT NULL
      AND ${table.voidedAt} IS NOT NULL
      AND ${table.voidedByUserId} IS NOT NULL
      AND ${table.voidReason} IS NOT NULL
    )
  `;
}

export const salesDocument = pgTable(
  "sales_document",
  {
    ...documentLifecycleColumns(),
    customerPartyId: uuid("customer_party_id").notNull(),
    dueDate: date("due_date"),
    invoiceDate: date("invoice_date").notNull(),
    notes: text("notes"),
    outstandingMinor: pgBigint("outstanding_minor", { mode: "bigint" }).default(0n).notNull(),
    terms: text("terms"),
    totalMinor: pgBigint("total_minor", { mode: "bigint" }).default(0n).notNull()
  },
  (table) => [
    uniqueIndex("sales_document_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("sales_document_organization_id_draft_reference_uidx").on(
      table.organizationId,
      table.draftReference
    ),
    uniqueIndex("sales_document_organization_id_document_number_uidx")
      .on(table.organizationId, table.documentNumber)
      .where(sql`document_number IS NOT NULL`),
    uniqueIndex("sales_document_organization_id_journal_entry_id_uidx")
      .on(table.organizationId, table.journalEntryId)
      .where(sql`journal_entry_id IS NOT NULL`),
    index("sales_document_register_idx").on(
      table.organizationId,
      table.status,
      table.invoiceDate,
      table.id
    ),
    index("sales_document_register_all_idx").on(table.organizationId, table.invoiceDate, table.id),
    index("sales_document_customer_idx").on(table.organizationId, table.customerPartyId),
    index("sales_document_open_allocation_target_idx")
      .on(table.organizationId, table.customerPartyId, table.invoiceDate, table.id)
      .where(sql`status = 'posted' AND outstanding_minor > 0`),
    foreignKey({
      columns: [table.organizationId, table.customerPartyId],
      foreignColumns: [party.organizationId, party.id],
      name: "sales_document_organization_id_customer_party_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.journalEntryId],
      foreignColumns: [journalEntry.organizationId, journalEntry.id],
      name: "sales_document_organization_id_journal_entry_id_fkey"
    }).onDelete("restrict"),
    check("sales_document_status_ck", sqlInList(table.status, DOCUMENT_STATUSES)),
    check("sales_document_lifecycle_ck", documentLifecycleCheck(table)),
    check(
      "sales_document_date_order_ck",
      sql`${table.dueDate} IS NULL OR ${table.invoiceDate} <= ${table.dueDate}`
    ),
    check("sales_document_total_minor_ck", sql`${table.totalMinor} >= 0`),
    check("sales_document_outstanding_minor_ck", sql`${table.outstandingMinor} >= 0`),
    check(
      "sales_document_outstanding_lte_total_ck",
      sql`${table.outstandingMinor} <= ${table.totalMinor}`
    )
  ]
);

export const salesDocumentLine = pgTable(
  "sales_document_line",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    incomeAccountId: uuid("income_account_id").notNull(),
    itemId: uuid("item_id"),
    lineNumber: integer("line_number").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    rateMinor: pgBigint("rate_minor", { mode: "bigint" }).notNull(),
    hsnCode: text("hsn_code"),
    salesDocumentId: uuid("sales_document_id").notNull(),
    totalMinor: pgBigint("total_minor", { mode: "bigint" }).notNull(),
    unit: text("unit")
  },
  (table) => [
    uniqueIndex("sales_document_line_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("sales_document_line_document_line_uidx").on(
      table.organizationId,
      table.salesDocumentId,
      table.lineNumber
    ),
    index("sales_document_line_document_idx").on(table.organizationId, table.salesDocumentId),
    index("sales_document_line_income_account_idx").on(table.organizationId, table.incomeAccountId),
    index("sales_document_line_item_idx").on(table.organizationId, table.itemId),
    foreignKey({
      columns: [table.organizationId, table.salesDocumentId],
      foreignColumns: [salesDocument.organizationId, salesDocument.id],
      name: "sales_document_line_organization_id_sales_document_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.incomeAccountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "sales_document_line_organization_id_income_account_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "sales_document_line_organization_id_item_id_fkey"
    }).onDelete("restrict"),
    check("sales_document_line_line_number_ck", sql`${table.lineNumber} > 0`),
    check(
      "sales_document_line_description_not_blank_ck",
      sql`length(trim(${table.description})) > 0`
    ),
    check("sales_document_line_quantity_ck", sql`${table.quantity} > 0`),
    check("sales_document_line_rate_minor_ck", sql`${table.rateMinor} > 0`),
    check("sales_document_line_total_minor_ck", sql`${table.totalMinor} > 0`)
  ]
);

export const purchaseDocument = pgTable(
  "purchase_document",
  {
    ...documentLifecycleColumns(),
    documentKind: text("document_kind", { enum: PURCHASE_DOCUMENT_KINDS }).notNull(),
    dueDate: date("due_date"),
    notes: text("notes"),
    outstandingMinor: pgBigint("outstanding_minor", { mode: "bigint" }).default(0n).notNull(),
    purchaseDate: date("purchase_date").notNull(),
    totalMinor: pgBigint("total_minor", { mode: "bigint" }).default(0n).notNull(),
    vendorPartyId: uuid("vendor_party_id").notNull(),
    vendorReferenceNumber: text("vendor_reference_number")
  },
  (table) => [
    uniqueIndex("purchase_document_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("purchase_document_organization_id_draft_reference_uidx").on(
      table.organizationId,
      table.draftReference
    ),
    uniqueIndex("purchase_document_organization_id_document_number_uidx")
      .on(table.organizationId, table.documentNumber)
      .where(sql`document_number IS NOT NULL`),
    uniqueIndex("purchase_document_organization_id_journal_entry_id_uidx")
      .on(table.organizationId, table.journalEntryId)
      .where(sql`journal_entry_id IS NOT NULL`),
    index("purchase_document_register_idx").on(
      table.organizationId,
      table.documentKind,
      table.status,
      table.purchaseDate,
      table.id
    ),
    index("purchase_document_register_all_idx").on(
      table.organizationId,
      table.purchaseDate,
      table.id
    ),
    index("purchase_document_kind_register_idx").on(
      table.organizationId,
      table.documentKind,
      table.purchaseDate,
      table.id
    ),
    index("purchase_document_status_register_idx").on(
      table.organizationId,
      table.status,
      table.purchaseDate,
      table.id
    ),
    index("purchase_document_vendor_idx").on(table.organizationId, table.vendorPartyId),
    index("purchase_document_open_allocation_target_idx")
      .on(table.organizationId, table.vendorPartyId, table.purchaseDate, table.id)
      .where(sql`status = 'posted' AND outstanding_minor > 0`),
    foreignKey({
      columns: [table.organizationId, table.vendorPartyId],
      foreignColumns: [party.organizationId, party.id],
      name: "purchase_document_organization_id_vendor_party_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.journalEntryId],
      foreignColumns: [journalEntry.organizationId, journalEntry.id],
      name: "purchase_document_organization_id_journal_entry_id_fkey"
    }).onDelete("restrict"),
    check("purchase_document_status_ck", sqlInList(table.status, DOCUMENT_STATUSES)),
    check("purchase_document_kind_ck", sqlInList(table.documentKind, PURCHASE_DOCUMENT_KINDS)),
    check("purchase_document_lifecycle_ck", documentLifecycleCheck(table)),
    check(
      "purchase_document_date_order_ck",
      sql`${table.dueDate} IS NULL OR ${table.purchaseDate} <= ${table.dueDate}`
    ),
    check("purchase_document_total_minor_ck", sql`${table.totalMinor} >= 0`),
    check("purchase_document_outstanding_minor_ck", sql`${table.outstandingMinor} >= 0`),
    check(
      "purchase_document_outstanding_lte_total_ck",
      sql`${table.outstandingMinor} <= ${table.totalMinor}`
    )
  ]
);

export const purchaseDocumentLine = pgTable(
  "purchase_document_line",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull(),
    expenseAccountId: uuid("expense_account_id").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    itemId: uuid("item_id"),
    lineNumber: integer("line_number").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    hsnCode: text("hsn_code"),
    purchaseDocumentId: uuid("purchase_document_id").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    rateMinor: pgBigint("rate_minor", { mode: "bigint" }).notNull(),
    totalMinor: pgBigint("total_minor", { mode: "bigint" }).notNull(),
    unit: text("unit")
  },
  (table) => [
    uniqueIndex("purchase_document_line_organization_id_id_uidx").on(
      table.organizationId,
      table.id
    ),
    uniqueIndex("purchase_document_line_document_line_uidx").on(
      table.organizationId,
      table.purchaseDocumentId,
      table.lineNumber
    ),
    index("purchase_document_line_document_idx").on(table.organizationId, table.purchaseDocumentId),
    index("purchase_document_line_expense_account_idx").on(
      table.organizationId,
      table.expenseAccountId
    ),
    index("purchase_document_line_item_idx").on(table.organizationId, table.itemId),
    foreignKey({
      columns: [table.organizationId, table.purchaseDocumentId],
      foreignColumns: [purchaseDocument.organizationId, purchaseDocument.id],
      name: "purchase_document_line_organization_id_purchase_document_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.expenseAccountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "purchase_document_line_organization_id_expense_account_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "purchase_document_line_organization_id_item_id_fkey"
    }).onDelete("restrict"),
    check("purchase_document_line_line_number_ck", sql`${table.lineNumber} > 0`),
    check(
      "purchase_document_line_description_not_blank_ck",
      sql`length(trim(${table.description})) > 0`
    ),
    check("purchase_document_line_quantity_ck", sql`${table.quantity} > 0`),
    check("purchase_document_line_rate_minor_ck", sql`${table.rateMinor} > 0`),
    check("purchase_document_line_total_minor_ck", sql`${table.totalMinor} > 0`)
  ]
);

export const settlementDocument = pgTable(
  "settlement_document",
  {
    ...documentLifecycleColumns(),
    amountMinor: pgBigint("amount_minor", { mode: "bigint" }).notNull(),
    cashAccountId: uuid("cash_account_id").notNull(),
    direction: text("direction", { enum: SETTLEMENT_DIRECTIONS }).notNull(),
    notes: text("notes"),
    partyId: uuid("party_id").notNull(),
    paymentMode: text("payment_mode", { enum: PAYMENT_MODES }).notNull(),
    reference: text("reference"),
    settlementDate: date("settlement_date").notNull()
  },
  (table) => [
    uniqueIndex("settlement_document_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("settlement_document_organization_id_draft_reference_uidx").on(
      table.organizationId,
      table.draftReference
    ),
    uniqueIndex("settlement_document_organization_id_document_number_uidx")
      .on(table.organizationId, table.documentNumber)
      .where(sql`document_number IS NOT NULL`),
    uniqueIndex("settlement_document_organization_id_journal_entry_id_uidx")
      .on(table.organizationId, table.journalEntryId)
      .where(sql`journal_entry_id IS NOT NULL`),
    index("settlement_document_register_idx").on(
      table.organizationId,
      table.direction,
      table.status,
      table.settlementDate,
      table.id
    ),
    index("settlement_document_register_all_idx").on(
      table.organizationId,
      table.settlementDate,
      table.id
    ),
    index("settlement_document_direction_register_idx").on(
      table.organizationId,
      table.direction,
      table.settlementDate,
      table.id
    ),
    index("settlement_document_status_register_idx").on(
      table.organizationId,
      table.status,
      table.settlementDate,
      table.id
    ),
    index("settlement_document_party_idx").on(table.organizationId, table.partyId),
    index("settlement_document_cash_account_idx").on(table.organizationId, table.cashAccountId),
    foreignKey({
      columns: [table.organizationId, table.partyId],
      foreignColumns: [party.organizationId, party.id],
      name: "settlement_document_organization_id_party_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.cashAccountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "settlement_document_organization_id_cash_account_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.journalEntryId],
      foreignColumns: [journalEntry.organizationId, journalEntry.id],
      name: "settlement_document_organization_id_journal_entry_id_fkey"
    }).onDelete("restrict"),
    check("settlement_document_status_ck", sqlInList(table.status, DOCUMENT_STATUSES)),
    check("settlement_document_direction_ck", sqlInList(table.direction, SETTLEMENT_DIRECTIONS)),
    check("settlement_document_payment_mode_ck", sqlInList(table.paymentMode, PAYMENT_MODES)),
    check("settlement_document_lifecycle_ck", documentLifecycleCheck(table)),
    check("settlement_document_amount_minor_ck", sql`${table.amountMinor} > 0`)
  ]
);

export const settlementAllocation = pgTable(
  "settlement_allocation",
  {
    amountMinor: pgBigint("amount_minor", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    purchaseDocumentId: uuid("purchase_document_id"),
    salesDocumentId: uuid("sales_document_id"),
    settlementDocumentId: uuid("settlement_document_id").notNull(),
    targetDocumentKind: text("target_document_kind", { enum: ALLOCATABLE_DOCUMENT_KINDS }).notNull()
  },
  (table) => [
    uniqueIndex("settlement_allocation_organization_id_id_uidx").on(table.organizationId, table.id),
    index("settlement_allocation_settlement_document_idx").on(
      table.organizationId,
      table.settlementDocumentId
    ),
    index("settlement_allocation_sales_document_idx").on(
      table.organizationId,
      table.salesDocumentId
    ),
    index("settlement_allocation_purchase_document_idx").on(
      table.organizationId,
      table.purchaseDocumentId
    ),
    uniqueIndex("settlement_allocation_sales_target_uidx")
      .on(table.organizationId, table.settlementDocumentId, table.salesDocumentId)
      .where(sql`sales_document_id IS NOT NULL`),
    uniqueIndex("settlement_allocation_purchase_target_uidx")
      .on(table.organizationId, table.settlementDocumentId, table.purchaseDocumentId)
      .where(sql`purchase_document_id IS NOT NULL`),
    foreignKey({
      columns: [table.organizationId, table.settlementDocumentId],
      foreignColumns: [settlementDocument.organizationId, settlementDocument.id],
      name: "settlement_allocation_organization_id_settlement_document_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.salesDocumentId],
      foreignColumns: [salesDocument.organizationId, salesDocument.id],
      name: "settlement_allocation_organization_id_sales_document_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.purchaseDocumentId],
      foreignColumns: [purchaseDocument.organizationId, purchaseDocument.id],
      name: "settlement_allocation_organization_id_purchase_document_id_fkey"
    }).onDelete("restrict"),
    check(
      "settlement_allocation_target_document_kind_ck",
      sqlInList(table.targetDocumentKind, ALLOCATABLE_DOCUMENT_KINDS)
    ),
    check("settlement_allocation_amount_minor_ck", sql`${table.amountMinor} > 0`),
    check(
      "settlement_allocation_target_ck",
      sql`
        (
          ${table.targetDocumentKind} = 'sales_invoice'
          AND ${table.salesDocumentId} IS NOT NULL
          AND ${table.purchaseDocumentId} IS NULL
        )
        OR (
          ${table.targetDocumentKind} IN ('purchase_bill', 'expense')
          AND ${table.salesDocumentId} IS NULL
          AND ${table.purchaseDocumentId} IS NOT NULL
        )
      `
    )
  ]
);
