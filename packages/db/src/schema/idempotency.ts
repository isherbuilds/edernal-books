import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export const idempotencyLedger = pgTable(
  "idempotency_ledger",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    errorSummaryJson: jsonb("error_summary_json").$type<Record<string, unknown>>(),
    expiresAt: timestamp("expires_at").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    lockedUntil: timestamp("locked_until"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    requestHash: text("request_hash").notNull(),
    responseJson: jsonb("response_json").$type<unknown>(),
    responseStatusCode: integer("response_status_code"),
    routeKey: text("route_key").notNull(),
    scopeId: text("scope_id").notNull(),
    scopeType: text("scope_type").notNull(),
    status: text("status").default("pending").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" })
  },
  (table) => [
    uniqueIndex("idempotency_ledger_scope_route_key_uidx").on(
      table.scopeType,
      table.scopeId,
      table.routeKey,
      table.idempotencyKey
    ),
    index("idempotency_ledger_organization_id_idx").on(table.organizationId)
  ]
);
