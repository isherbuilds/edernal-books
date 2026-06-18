import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export type AuditEventPayload = {
  before?: unknown;
  after?: unknown;
  metadata?: {
    ip?: string;
    requestId?: string;
    source?: string;
    userAgent?: string;
  };
};

export const auditEvent = pgTable(
  "audit_event",
  {
    action: text("action").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    payloadJson: jsonb("payload_json").$type<AuditEventPayload>().notNull(),
    scopeId: text("scope_id").notNull(),
    scopeType: text("scope_type").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" })
  },
  (table) => [
    index("audit_event_organization_id_idx").on(table.organizationId),
    index("audit_event_entity_idx").on(table.entityType, table.entityId)
  ]
);
