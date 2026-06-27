import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import { createUuidV7 } from "#@/utils/id";

export const sourceDocument = pgTable(
  "source_document",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    documentNumber: text("document_number"),
    id: uuid("id").$defaultFn(createUuidV7).primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull()
  },
  (table) => [
    uniqueIndex("source_document_organization_id_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("source_document_organization_id_type_number_uidx")
      .on(table.organizationId, table.type, table.documentNumber)
      .where(sql`${table.documentNumber} IS NOT NULL`),
    index("source_document_organization_id_idx").on(table.organizationId)
  ]
);
