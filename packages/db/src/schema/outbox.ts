import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export const outboxEvent = pgTable(
  "outbox_event",
  {
    aggregateId: text("aggregate_id").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    error: text("error"),
    eventType: text("event_type").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at"),
    retryCount: integer("retry_count").default(0).notNull(),
    status: text("status").default("pending").notNull()
  },
  (table) => [
    index("outbox_event_organization_id_idx").on(table.organizationId),
    index("outbox_event_status_available_at_idx").on(table.status, table.availableAt),
    check(
      "outbox_event_status_ck",
      sql`${table.status} IN ('pending', 'processing', 'processed', 'failed')`
    ),
    check("outbox_event_retry_count_ck", sql`${table.retryCount} >= 0`)
  ]
);
