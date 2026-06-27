import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { ACCOUNTING_PERIOD_STATUSES, FISCAL_YEAR_STATUSES } from "@tsu-stack/core/accounting";

import { organization, user } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export const fiscalYear = pgTable(
  "fiscal_year",
  {
    closedAt: timestamp("closed_at"),
    closedBy: text("closed_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    endDate: date("end_date").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    status: text("status", { enum: FISCAL_YEAR_STATUSES }).default("open").notNull()
  },
  (table) => [
    uniqueIndex("fiscal_year_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("fiscal_year_organization_id_start_date_uidx").on(
      table.organizationId,
      table.startDate
    ),
    index("fiscal_year_organization_id_idx").on(table.organizationId),
    check("fiscal_year_status_ck", sql`${table.status} IN ('open', 'closed')`),
    check("fiscal_year_date_order_ck", sql`${table.startDate} <= ${table.endDate}`)
  ]
);

export const accountingPeriod = pgTable(
  "accounting_period",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    endDate: date("end_date").notNull(),
    fiscalYearId: uuid("fiscal_year_id").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    lockedAt: timestamp("locked_at"),
    lockedBy: text("locked_by").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    status: text("status", { enum: ACCOUNTING_PERIOD_STATUSES }).default("open").notNull()
  },
  (table) => [
    uniqueIndex("accounting_period_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("accounting_period_organization_id_start_date_uidx").on(
      table.organizationId,
      table.startDate
    ),
    index("accounting_period_organization_id_idx").on(table.organizationId),
    foreignKey({
      columns: [table.organizationId, table.fiscalYearId],
      foreignColumns: [fiscalYear.organizationId, fiscalYear.id],
      name: "accounting_period_organization_id_fiscal_year_id_fkey"
    }).onDelete("cascade"),
    check("accounting_period_status_ck", sql`${table.status} IN ('open', 'locked', 'closed')`),
    check("accounting_period_date_order_ck", sql`${table.startDate} <= ${table.endDate}`)
  ]
);
