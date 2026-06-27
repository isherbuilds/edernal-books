import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import {
  DEFAULT_ORGANIZATION_SETTINGS,
  type CountryCode,
  type CurrencyCode,
  type FiscalYearStartMonth,
  type Timezone
} from "@tsu-stack/core/organizations";

import { organization } from "#@/schema/auth.schema";

export const currency = pgTable("currency", {
  active: boolean("active").default(true).notNull(),
  code: text("code").$type<CurrencyCode>().primaryKey(),
  decimalPlaces: integer("decimal_places").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull()
});

export const exchangeRate = pgTable(
  "exchange_rate",
  {
    baseCurrencyCode: text("base_currency_code")
      .$type<CurrencyCode>()
      .notNull()
      .references(() => currency.code),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    quoteCurrencyCode: text("quote_currency_code")
      .$type<CurrencyCode>()
      .notNull()
      .references(() => currency.code),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
    rateDate: date("rate_date").notNull(),
    source: text("source").notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.baseCurrencyCode, table.quoteCurrencyCode, table.rateDate, table.source],
      name: "exchange_rate_pk"
    }),
    check(
      "exchange_rate_distinct_currency_ck",
      sql`${table.baseCurrencyCode} <> ${table.quoteCurrencyCode}`
    ),
    check("exchange_rate_positive_rate_ck", sql`${table.rate}::numeric > 0`)
  ]
);

export const organizationSetting = pgTable(
  "organization_setting",
  {
    baseCurrencyCode: text("base_currency_code")
      .$type<CurrencyCode>()
      .default(DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode)
      .notNull()
      .references(() => currency.code),
    booksStartDate: date("books_start_date").notNull(),
    countryCode: text("country_code")
      .$type<CountryCode>()
      .default(DEFAULT_ORGANIZATION_SETTINGS.countryCode)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fiscalYearStartMonth: integer("fiscal_year_start_month")
      .$type<FiscalYearStartMonth>()
      .default(DEFAULT_ORGANIZATION_SETTINGS.fiscalYearStartMonth)
      .notNull(),
    legalName: text("legal_name").notNull(),
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    primaryEmail: text("primary_email"),
    primaryPhone: text("primary_phone"),
    timezone: text("timezone")
      .$type<Timezone>()
      .default(DEFAULT_ORGANIZATION_SETTINGS.timezone)
      .notNull(),
    tradeName: text("trade_name"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    check(
      "organization_setting_fiscal_year_start_month_ck",
      sql`${table.fiscalYearStartMonth} BETWEEN 1 AND 12`
    )
  ]
);
