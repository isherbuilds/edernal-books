import { boolean, date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const currency = pgTable("currency", {
  active: boolean("active").default(true).notNull(),
  code: text("code").primaryKey(),
  decimalPlaces: integer("decimal_places").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull()
});

export const organizationSetting = pgTable("organization_setting", {
  baseCurrencyCode: text("base_currency_code")
    .default("INR")
    .notNull()
    .references(() => currency.code),
  booksStartDate: date("books_start_date").notNull(),
  countryCode: text("country_code").default("IN").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  fiscalYearStartMonth: integer("fiscal_year_start_month").default(4).notNull(),
  legalName: text("legal_name").notNull(),
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  tradeName: text("trade_name"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});
