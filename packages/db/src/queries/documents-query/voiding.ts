import { and, eq, sql, type SQLWrapper } from "drizzle-orm";

import { type VoidedDocument } from "@tsu-stack/core/documents";

import { type Database, type TransactionClient } from "#@/client";
import { reverseJournalEntryInTransaction } from "#@/queries/accounting";
import { purchaseDocument, salesDocument, settlementDocument } from "#@/schema/documents";
import { journalEntry } from "#@/schema/journal";

import { applySettlementAllocations } from "./allocations";
import { insertDocumentAuditEvent } from "./audit";
import { DocumentDbError } from "./errors";
import { loadSettlementAllocations } from "./read-model";
import { documentLabel } from "./shared";
import {
  type VoidPurchaseDocumentDbInput,
  type VoidSalesDocumentDbInput,
  type VoidSettlementDbInput
} from "./types";

export async function voidSalesDocument(
  db: Database,
  input: VoidSalesDocumentDbInput
): Promise<VoidedDocument> {
  return db.transaction(async (tx) => voidSalesDocumentInTransaction(tx, input));
}

export async function voidPurchaseDocument(
  db: Database,
  input: VoidPurchaseDocumentDbInput
): Promise<VoidedDocument> {
  return db.transaction(async (tx) => voidPurchaseDocumentInTransaction(tx, input));
}

export async function voidSettlementDocument(
  db: Database,
  input: VoidSettlementDbInput
): Promise<VoidedDocument> {
  return db.transaction(async (tx) => voidSettlementDocumentInTransaction(tx, input));
}

async function voidSalesDocumentInTransaction(
  tx: TransactionClient,
  input: VoidSalesDocumentDbInput
): Promise<VoidedDocument> {
  const row = await markSalesDocumentVoided(tx, input);
  assertVoidDateOnOrAfterPostingDate(input.voidDate, row.originalPostingDate);

  const reversal = await reverseJournalEntryInTransaction(tx, {
    allowSourcedEntry: true,
    description: `Void sales invoice ${row.documentNumber}: ${input.reason}`,
    journalEntryId: row.journalEntryId,
    organizationId: input.organizationId,
    postingDate: input.voidDate,
    userId: input.userId
  });

  await insertDocumentAuditEvent(tx, {
    action: "sales_invoice.voided",
    after: { reason: input.reason, reversalJournalEntryId: reversal.journalEntryId },
    entityId: input.documentId,
    entityType: "sales_invoice",
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: "sales_invoice",
    documentNumber: row.documentNumber,
    journalEntryId: row.journalEntryId,
    reversalJournalEntryId: reversal.journalEntryId
  };
}

async function voidPurchaseDocumentInTransaction(
  tx: TransactionClient,
  input: VoidPurchaseDocumentDbInput
): Promise<VoidedDocument> {
  const row = await markPurchaseDocumentVoided(tx, input);
  assertVoidDateOnOrAfterPostingDate(input.voidDate, row.originalPostingDate);

  const reversal = await reverseJournalEntryInTransaction(tx, {
    allowSourcedEntry: true,
    description: `Void ${documentLabel(row.documentKind).toLowerCase()} ${row.documentNumber}: ${input.reason}`,
    journalEntryId: row.journalEntryId,
    organizationId: input.organizationId,
    postingDate: input.voidDate,
    userId: input.userId
  });

  await insertDocumentAuditEvent(tx, {
    action: `${row.documentKind}.voided`,
    after: { reason: input.reason, reversalJournalEntryId: reversal.journalEntryId },
    entityId: input.documentId,
    entityType: row.documentKind,
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: row.documentKind,
    documentNumber: row.documentNumber,
    journalEntryId: row.journalEntryId,
    reversalJournalEntryId: reversal.journalEntryId
  };
}

async function voidSettlementDocumentInTransaction(
  tx: TransactionClient,
  input: VoidSettlementDbInput
): Promise<VoidedDocument> {
  const row = await markSettlementDocumentVoided(tx, input);
  assertVoidDateOnOrAfterPostingDate(input.voidDate, row.originalPostingDate);

  const allocations = await loadSettlementAllocations(tx, input);

  await applySettlementAllocations(tx, {
    allocations,
    direction: row.direction,
    multiplier: 1n,
    organizationId: input.organizationId,
    partyId: row.partyId
  });

  const reversal = await reverseJournalEntryInTransaction(tx, {
    allowSourcedEntry: true,
    description: `Void settlement ${row.documentNumber}: ${input.reason}`,
    journalEntryId: row.journalEntryId,
    organizationId: input.organizationId,
    postingDate: input.voidDate,
    userId: input.userId
  });

  await insertDocumentAuditEvent(tx, {
    action: row.direction === "received" ? "receipt.voided" : "payment.voided",
    after: { reason: input.reason, reversalJournalEntryId: reversal.journalEntryId },
    entityId: input.documentId,
    entityType: "settlement",
    organizationId: input.organizationId,
    userId: input.userId
  });

  return {
    documentId: input.documentId,
    documentKind: "settlement",
    documentNumber: row.documentNumber,
    journalEntryId: row.journalEntryId,
    reversalJournalEntryId: reversal.journalEntryId
  };
}

async function markSalesDocumentVoided(tx: TransactionClient, input: VoidSalesDocumentDbInput) {
  const [row] = await tx
    .update(salesDocument)
    .set({
      outstandingMinor: 0n,
      status: "voided",
      voidReason: input.reason,
      voidedAt: new Date(),
      voidedByUserId: input.userId
    })
    .where(
      and(
        eq(salesDocument.id, input.documentId),
        eq(salesDocument.organizationId, input.organizationId),
        eq(salesDocument.status, "posted"),
        sql`${salesDocument.outstandingMinor} = ${salesDocument.totalMinor}`
      )
    )
    .returning({
      documentNumber: salesDocument.documentNumber,
      journalEntryId: salesDocument.journalEntryId,
      originalPostingDate: originalPostingDate(
        salesDocument.organizationId,
        salesDocument.journalEntryId
      )
    });

  assertVoidedDocumentRow(row);
  return row;
}

async function markPurchaseDocumentVoided(
  tx: TransactionClient,
  input: VoidPurchaseDocumentDbInput
) {
  const [row] = await tx
    .update(purchaseDocument)
    .set({
      outstandingMinor: 0n,
      status: "voided",
      voidReason: input.reason,
      voidedAt: new Date(),
      voidedByUserId: input.userId
    })
    .where(
      and(
        eq(purchaseDocument.id, input.documentId),
        eq(purchaseDocument.organizationId, input.organizationId),
        eq(purchaseDocument.documentKind, input.documentKind),
        eq(purchaseDocument.status, "posted"),
        sql`${purchaseDocument.outstandingMinor} = ${purchaseDocument.totalMinor}`
      )
    )
    .returning({
      documentKind: purchaseDocument.documentKind,
      documentNumber: purchaseDocument.documentNumber,
      journalEntryId: purchaseDocument.journalEntryId,
      originalPostingDate: originalPostingDate(
        purchaseDocument.organizationId,
        purchaseDocument.journalEntryId
      )
    });

  assertVoidedDocumentRow(row);
  return row;
}

async function markSettlementDocumentVoided(tx: TransactionClient, input: VoidSettlementDbInput) {
  const [row] = await tx
    .update(settlementDocument)
    .set({
      status: "voided",
      voidReason: input.reason,
      voidedAt: new Date(),
      voidedByUserId: input.userId
    })
    .where(
      and(
        eq(settlementDocument.id, input.documentId),
        eq(settlementDocument.organizationId, input.organizationId),
        eq(settlementDocument.status, "posted")
      )
    )
    .returning({
      direction: settlementDocument.direction,
      documentNumber: settlementDocument.documentNumber,
      journalEntryId: settlementDocument.journalEntryId,
      originalPostingDate: originalPostingDate(
        settlementDocument.organizationId,
        settlementDocument.journalEntryId
      ),
      partyId: settlementDocument.partyId
    });

  assertVoidedDocumentRow(row);
  return row;
}

function assertVoidDateOnOrAfterPostingDate(voidDate: string, originalPostingDate: string): void {
  if (voidDate < originalPostingDate) {
    throw new DocumentDbError("DOCUMENT_DATE_INVALID");
  }
}

function originalPostingDate(
  documentOrganizationId: SQLWrapper,
  documentJournalEntryId: SQLWrapper
) {
  return sql<string>`(
    SELECT ${journalEntry.postingDate}
    FROM ${journalEntry}
    WHERE ${journalEntry.organizationId} = ${documentOrganizationId}
      AND ${journalEntry.id} = ${documentJournalEntryId}
  )`;
}

function assertVoidedDocumentRow<
  T extends {
    documentNumber: string | null;
    journalEntryId: string | null;
    originalPostingDate: string | null;
  }
>(
  row: T | undefined
): asserts row is T & {
  documentNumber: string;
  journalEntryId: string;
  originalPostingDate: string;
} {
  if (!row?.documentNumber || !row.journalEntryId || !row.originalPostingDate) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }
}
