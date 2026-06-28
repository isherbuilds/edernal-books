import { sql } from "drizzle-orm";
import {
  bigint as pgBigint,
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { ITEM_KINDS, ITEM_USAGES } from "@tsu-stack/core/items";

import { ledgerAccount } from "#@/schema/accounts";
import { organization } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";
import { sqlInList } from "#@/utils/sql";

export const item = pgTable(
  "item",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    expenseAccountId: uuid("expense_account_id"),
    hsnCode: text("hsn_code"),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    kind: text("kind", { enum: ITEM_KINDS }).notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    purchaseRateMinor: pgBigint("purchase_rate_minor", { mode: "bigint" }),
    salesAccountId: uuid("sales_account_id"),
    salesRateMinor: pgBigint("sales_rate_minor", { mode: "bigint" }),
    unit: text("unit"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    usage: text("usage", { enum: ITEM_USAGES }).notNull()
  },
  (table) => [
    uniqueIndex("item_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("item_organization_id_normalized_name_uidx")
      .on(table.organizationId, table.normalizedName)
      .where(sql`is_active`),
    index("item_organization_id_normalized_name_id_idx").on(
      table.organizationId,
      table.normalizedName,
      table.id
    ),
    index("item_organization_id_idx").on(table.organizationId),
    index("item_organization_id_kind_idx").on(table.organizationId, table.kind),
    index("item_organization_id_usage_idx").on(table.organizationId, table.usage),
    index("item_organization_id_active_idx").on(table.organizationId, table.isActive),
    foreignKey({
      columns: [table.organizationId, table.salesAccountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "item_organization_id_sales_account_id_fkey"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.expenseAccountId],
      foreignColumns: [ledgerAccount.organizationId, ledgerAccount.id],
      name: "item_organization_id_expense_account_id_fkey"
    }).onDelete("restrict"),
    check("item_kind_ck", sqlInList(table.kind, ITEM_KINDS)),
    check("item_usage_ck", sqlInList(table.usage, ITEM_USAGES)),
    check("item_name_not_blank_ck", sql`length(trim(${table.name})) > 0`),
    check("item_normalized_name_not_blank_ck", sql`length(trim(${table.normalizedName})) > 0`),
    check(
      "item_sales_rate_minor_non_negative_ck",
      sql`${table.salesRateMinor} IS NULL OR ${table.salesRateMinor} >= 0`
    ),
    check(
      "item_purchase_rate_minor_non_negative_ck",
      sql`${table.purchaseRateMinor} IS NULL OR ${table.purchaseRateMinor} >= 0`
    )
  ]
);
