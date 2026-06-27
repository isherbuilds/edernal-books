import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { PARTY_KINDS } from "@tsu-stack/core/parties";

import { organization } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export const party = pgTable(
  "party",
  {
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    countryCode: text("country_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    kind: text("kind", { enum: PARTY_KINDS }).notNull(),
    legalName: text("legal_name"),
    normalizedName: text("normalized_name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    phone: text("phone"),
    postalCode: text("postal_code"),
    state: text("state"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex("party_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("party_organization_id_normalized_name_uidx").on(
      table.organizationId,
      table.normalizedName
    ),
    index("party_organization_id_idx").on(table.organizationId),
    index("party_organization_id_kind_idx").on(table.organizationId, table.kind),
    index("party_organization_id_active_idx").on(table.organizationId, table.isActive),
    check("party_kind_ck", sql`${table.kind} IN ('customer', 'vendor', 'both')`),
    check("party_display_name_not_blank_ck", sql`length(trim(${table.displayName})) > 0`),
    check("party_normalized_name_not_blank_ck", sql`length(trim(${table.normalizedName})) > 0`)
  ]
);
