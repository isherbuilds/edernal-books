import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";

import {
  type PurchaseDocument,
  type SalesDocument,
  type SettlementDocument
} from "@tsu-stack/core/documents";

import { type TransactionClient } from "#@/client";
import {
  purchaseDocument,
  purchaseDocumentLine,
  salesDocument,
  salesDocumentLine,
  settlementAllocation,
  settlementDocument
} from "#@/schema/documents";
import { party } from "#@/schema/parties";

import { DocumentDbError } from "./errors";
import { toPurchaseDocumentDto, toSalesDocumentDto, toSettlementDocumentDto } from "./shared";

export async function getSalesDocumentInTransaction(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
): Promise<SalesDocument> {
  const [row, lines] = await Promise.all([
    selectSalesDocument(tx, input),
    loadSalesDocumentLines(tx, input)
  ]);

  if (!row) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }

  return toSalesDocumentDto(row, lines);
}

export async function getPurchaseDocumentInTransaction(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
): Promise<PurchaseDocument> {
  const [row, lines] = await Promise.all([
    selectPurchaseDocument(tx, input),
    loadPurchaseDocumentLines(tx, input)
  ]);

  if (!row) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }

  return toPurchaseDocumentDto(row, lines);
}

export async function getSettlementDocumentInTransaction(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
): Promise<SettlementDocument> {
  const [row, allocations] = await Promise.all([
    selectSettlementDocument(tx, input),
    loadSettlementAllocationsForDetail(tx, input)
  ]);

  if (!row) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }

  return toSettlementDocumentDto(row, allocations);
}

async function selectSalesDocument(
  db: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  const [row] = await db
    .select({
      ...getTableColumns(salesDocument),
      customerPartyName: party.displayName
    })
    .from(salesDocument)
    .innerJoin(
      party,
      and(
        eq(party.id, salesDocument.customerPartyId),
        eq(party.organizationId, input.organizationId)
      )
    )
    .where(
      and(
        eq(salesDocument.id, input.documentId),
        eq(salesDocument.organizationId, input.organizationId)
      )
    )
    .limit(1);

  return row ?? null;
}

async function selectSettlementDocument(
  db: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  const [row] = await db
    .select({
      ...getTableColumns(settlementDocument),
      partyName: party.displayName
    })
    .from(settlementDocument)
    .innerJoin(
      party,
      and(eq(party.id, settlementDocument.partyId), eq(party.organizationId, input.organizationId))
    )
    .where(
      and(
        eq(settlementDocument.id, input.documentId),
        eq(settlementDocument.organizationId, input.organizationId)
      )
    )
    .limit(1);

  return row ?? null;
}

async function selectPurchaseDocument(
  db: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  const [row] = await db
    .select({
      ...getTableColumns(purchaseDocument),
      vendorPartyName: party.displayName
    })
    .from(purchaseDocument)
    .innerJoin(
      party,
      and(
        eq(party.id, purchaseDocument.vendorPartyId),
        eq(party.organizationId, input.organizationId)
      )
    )
    .where(
      and(
        eq(purchaseDocument.id, input.documentId),
        eq(purchaseDocument.organizationId, input.organizationId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function loadSalesDocumentLines(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  return tx
    .select()
    .from(salesDocumentLine)
    .where(
      and(
        eq(salesDocumentLine.salesDocumentId, input.documentId),
        eq(salesDocumentLine.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(salesDocumentLine.lineNumber));
}

export async function loadPurchaseDocumentLines(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  return tx
    .select()
    .from(purchaseDocumentLine)
    .where(
      and(
        eq(purchaseDocumentLine.purchaseDocumentId, input.documentId),
        eq(purchaseDocumentLine.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(purchaseDocumentLine.lineNumber));
}

export async function loadSettlementAllocations(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  return tx
    .select()
    .from(settlementAllocation)
    .where(
      and(
        eq(settlementAllocation.settlementDocumentId, input.documentId),
        eq(settlementAllocation.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(settlementAllocation.id));
}

async function loadSettlementAllocationsForDetail(
  tx: TransactionClient,
  input: { documentId: string; organizationId: string }
) {
  return tx
    .select({
      amountMinor: settlementAllocation.amountMinor,
      id: settlementAllocation.id,
      purchaseDocumentId: settlementAllocation.purchaseDocumentId,
      salesDocumentId: settlementAllocation.salesDocumentId,
      targetDocumentKind: settlementAllocation.targetDocumentKind,
      targetDocumentNumber: sql<
        string | null
      >`coalesce(${salesDocument.documentNumber}, ${purchaseDocument.documentNumber})`
    })
    .from(settlementAllocation)
    .leftJoin(
      salesDocument,
      and(
        eq(salesDocument.id, settlementAllocation.salesDocumentId),
        eq(salesDocument.organizationId, settlementAllocation.organizationId)
      )
    )
    .leftJoin(
      purchaseDocument,
      and(
        eq(purchaseDocument.id, settlementAllocation.purchaseDocumentId),
        eq(purchaseDocument.organizationId, settlementAllocation.organizationId)
      )
    )
    .where(
      and(
        eq(settlementAllocation.settlementDocumentId, input.documentId),
        eq(settlementAllocation.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(settlementAllocation.id));
}
