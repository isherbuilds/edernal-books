import { sql } from "drizzle-orm";
import {
  bigint as pgBigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { LEDGER_ACCOUNT_CATEGORIES, NORMAL_BALANCES } from "@tsu-stack/core/accounting";

import { organization } from "#@/schema/auth.schema";
import { fiscalYear } from "#@/schema/periods";
import { createUuidV7 } from "#@/utils/id";

export const ledgerAccount = pgTable(
  "ledger_account",
  {
    accountCategory: text("account_category", { enum: LEDGER_ACCOUNT_CATEGORIES }).notNull(),
    accountType: text("account_type").notNull(),
    active: boolean("active").default(true).notNull(),
    allowManualPosting: boolean("allow_manual_posting").default(true).notNull(),
    code: text("code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    isGroup: boolean("is_group").default(false).notNull(),
    name: text("name").notNull(),
    normalBalance: text("normal_balance", { enum: NORMAL_BALANCES }).notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    parentAccountId: uuid("parent_account_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    systemKey: text("system_key"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex("ledger_account_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("ledger_account_organization_id_code_uidx").on(table.organizationId, table.code),
    uniqueIndex("ledger_account_organization_id_system_key_uidx")
      .on(table.organizationId, table.systemKey)
      .where(sql`${table.systemKey} IS NOT NULL`),
    index("ledger_account_organization_id_idx").on(table.organizationId),
    foreignKey({
      columns: [table.organizationId, table.parentAccountId],
      foreignColumns: [table.organizationId, table.id],
      name: "ledger_account_organization_id_parent_account_id_fkey"
    }).onDelete("restrict"),
    check(
      "ledger_account_category_ck",
      sql`${table.accountCategory} IN ('asset', 'liability', 'equity', 'income', 'expense')`
    ),
    check("ledger_account_normal_balance_ck", sql`${table.normalBalance} IN ('debit', 'credit')`)
  ]
);

export const numberSequence = pgTable(
  "number_sequence",
  {
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    entityType: text("entity_type").notNull(),
    fiscalYearId: uuid("fiscal_year_id").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    nextNumber: pgBigint("next_number", { mode: "bigint" }).default(1n).notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    padding: integer("padding").default(0).notNull(),
    prefix: text("prefix").default("").notNull(),
    resetPolicy: text("reset_policy").default("never").notNull(),
    suffix: text("suffix").default("").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex("number_sequence_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("number_sequence_scope_uidx").on(
      table.organizationId,
      table.entityType,
      table.fiscalYearId
    ),
    index("number_sequence_organization_id_idx").on(table.organizationId),
    foreignKey({
      columns: [table.organizationId, table.fiscalYearId],
      foreignColumns: [fiscalYear.organizationId, fiscalYear.id],
      name: "number_sequence_organization_id_fiscal_year_id_fkey"
    }).onDelete("restrict"),
    check("number_sequence_next_number_ck", sql`${table.nextNumber} > 0`),
    check("number_sequence_padding_ck", sql`${table.padding} >= 0`),
    check("number_sequence_reset_policy_ck", sql`${table.resetPolicy} IN ('never', 'fiscal_year')`)
  ]
);
