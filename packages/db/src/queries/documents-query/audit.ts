import { type DocumentKind } from "@tsu-stack/core/documents";

import { type TransactionClient } from "#@/client";
import { auditEvent } from "#@/schema/audit";

export async function insertDocumentAuditEvent(
  tx: TransactionClient,
  input: {
    action: string;
    after: unknown;
    entityId: string;
    entityType: DocumentKind;
    organizationId: string;
    userId: string;
  }
) {
  await tx.insert(auditEvent).values({
    action: input.action,
    entityId: input.entityId,
    entityType: input.entityType,
    organizationId: input.organizationId,
    payloadJson: {
      after: input.after,
      metadata: { source: "user" }
    },
    scopeId: input.entityId,
    scopeType: input.entityType,
    userId: input.userId
  });
}
