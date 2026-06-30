import { and, desc, eq, gt, sql, type SQLWrapper } from "drizzle-orm";

import {
  type ListAllocationTargetsOutput,
  type ListDocumentsOutput,
  type DocumentRegisterItem
} from "@tsu-stack/core/documents";
import { clampCursorLimit } from "@tsu-stack/core/pagination";

import { type Database } from "#@/client";
import {
  createCursorPage,
  decodeCursor,
  encodeCursor,
  parseDateIdCursor,
  type DateIdCursor
} from "#@/queries/cursors";
import { purchaseDocument, salesDocument, settlementDocument } from "#@/schema/documents";

import { DocumentDbError } from "./errors";
import {
  type ListAllocationTargetsDbInput,
  type ListPurchaseDocumentsDbInput,
  type ListSalesDocumentsDbInput,
  type ListSettlementsDbInput
} from "./types";

function encodeDocumentCursor(cursor: DateIdCursor): string {
  return encodeCursor(cursor);
}

function decodeDocumentCursor(token: string | undefined): DateIdCursor | null {
  if (!token) {
    return null;
  }

  return decodeCursor(token, parseDateIdCursor);
}

function toDocumentPage(rows: DocumentRegisterItem[], limit: number): ListDocumentsOutput {
  const page = createCursorPage(rows, limit, (row) =>
    encodeDocumentCursor({ documentDate: row.documentDate, id: row.id })
  );

  return {
    documents: page.pageRows,
    nextCursor: page.nextCursor
  };
}

export async function listSalesDocuments(
  db: Database,
  input: ListSalesDocumentsDbInput
): Promise<ListDocumentsOutput> {
  const limit = clampCursorLimit(input);
  const cursor = decodeDocumentCursor(input.cursor);
  const rows = await db
    .select({
      createdAt: salesDocument.createdAt,
      documentDate: salesDocument.invoiceDate,
      documentNumber: salesDocument.documentNumber,
      draftReference: salesDocument.draftReference,
      id: salesDocument.id,
      outstandingMinor: salesDocument.outstandingMinor,
      partyId: salesDocument.customerPartyId,
      status: salesDocument.status,
      totalMinor: salesDocument.totalMinor
    })
    .from(salesDocument)
    .where(
      and(
        eq(salesDocument.organizationId, input.organizationId),
        input.status ? eq(salesDocument.status, input.status) : undefined,
        beforeDocumentCursor(salesDocument.invoiceDate, salesDocument.id, cursor)
      )
    )
    .orderBy(desc(salesDocument.invoiceDate), desc(salesDocument.id))
    .limit(limit + 1);

  return toDocumentPage(
    rows.map((row) => {
      return {
        createdAt: row.createdAt.toISOString(),
        documentDate: row.documentDate,
        documentKind: "sales_invoice",
        documentNumber: row.documentNumber,
        draftReference: row.draftReference,
        id: row.id,
        outstandingMinor: row.outstandingMinor.toString(),
        partyId: row.partyId,
        status: row.status,
        totalMinor: row.totalMinor.toString()
      };
    }),
    limit
  );
}

export async function listPurchaseDocuments(
  db: Database,
  input: ListPurchaseDocumentsDbInput
): Promise<ListDocumentsOutput> {
  const limit = clampCursorLimit(input);
  const cursor = decodeDocumentCursor(input.cursor);
  const rows = await db
    .select({
      createdAt: purchaseDocument.createdAt,
      documentDate: purchaseDocument.purchaseDate,
      documentKind: purchaseDocument.documentKind,
      documentNumber: purchaseDocument.documentNumber,
      draftReference: purchaseDocument.draftReference,
      id: purchaseDocument.id,
      outstandingMinor: purchaseDocument.outstandingMinor,
      partyId: purchaseDocument.vendorPartyId,
      status: purchaseDocument.status,
      totalMinor: purchaseDocument.totalMinor
    })
    .from(purchaseDocument)
    .where(
      and(
        eq(purchaseDocument.organizationId, input.organizationId),
        input.documentKind ? eq(purchaseDocument.documentKind, input.documentKind) : undefined,
        input.status ? eq(purchaseDocument.status, input.status) : undefined,
        beforeDocumentCursor(purchaseDocument.purchaseDate, purchaseDocument.id, cursor)
      )
    )
    .orderBy(desc(purchaseDocument.purchaseDate), desc(purchaseDocument.id))
    .limit(limit + 1);

  return toDocumentPage(
    rows.map((row) => {
      return {
        createdAt: row.createdAt.toISOString(),
        documentDate: row.documentDate,
        documentKind: row.documentKind,
        documentNumber: row.documentNumber,
        draftReference: row.draftReference,
        id: row.id,
        outstandingMinor: row.outstandingMinor.toString(),
        partyId: row.partyId,
        status: row.status,
        totalMinor: row.totalMinor.toString()
      };
    }),
    limit
  );
}

export async function listSettlementDocuments(
  db: Database,
  input: ListSettlementsDbInput
): Promise<ListDocumentsOutput> {
  const limit = clampCursorLimit(input);
  const cursor = decodeDocumentCursor(input.cursor);
  const rows = await db
    .select({
      createdAt: settlementDocument.createdAt,
      documentDate: settlementDocument.settlementDate,
      documentNumber: settlementDocument.documentNumber,
      draftReference: settlementDocument.draftReference,
      id: settlementDocument.id,
      partyId: settlementDocument.partyId,
      status: settlementDocument.status,
      totalMinor: settlementDocument.amountMinor
    })
    .from(settlementDocument)
    .where(
      and(
        eq(settlementDocument.organizationId, input.organizationId),
        input.direction ? eq(settlementDocument.direction, input.direction) : undefined,
        input.status ? eq(settlementDocument.status, input.status) : undefined,
        beforeDocumentCursor(settlementDocument.settlementDate, settlementDocument.id, cursor)
      )
    )
    .orderBy(desc(settlementDocument.settlementDate), desc(settlementDocument.id))
    .limit(limit + 1);

  return toDocumentPage(
    rows.map((row) => {
      return {
        createdAt: row.createdAt.toISOString(),
        documentDate: row.documentDate,
        documentKind: "settlement",
        documentNumber: row.documentNumber,
        draftReference: row.draftReference,
        id: row.id,
        outstandingMinor: null,
        partyId: row.partyId,
        status: row.status,
        totalMinor: row.totalMinor.toString()
      };
    }),
    limit
  );
}

export async function listAllocationTargets(
  db: Database,
  input: ListAllocationTargetsDbInput
): Promise<ListAllocationTargetsOutput> {
  const limit = clampCursorLimit(input);
  const cursor = decodeDocumentCursor(input.cursor);

  if (input.direction === "received") {
    const rows = await db
      .select({
        documentDate: salesDocument.invoiceDate,
        documentNumber: salesDocument.documentNumber,
        id: salesDocument.id,
        outstandingMinor: salesDocument.outstandingMinor,
        totalMinor: salesDocument.totalMinor
      })
      .from(salesDocument)
      .where(
        and(
          eq(salesDocument.organizationId, input.organizationId),
          eq(salesDocument.customerPartyId, input.partyId),
          eq(salesDocument.status, "posted"),
          gt(salesDocument.outstandingMinor, 0n),
          beforeDocumentCursor(salesDocument.invoiceDate, salesDocument.id, cursor)
        )
      )
      .orderBy(desc(salesDocument.invoiceDate), desc(salesDocument.id))
      .limit(limit + 1);

    const page = createCursorPage(
      rows.map((row) => {
        return {
          documentDate: row.documentDate,
          documentKind: "sales_invoice" as const,
          documentNumber: requireDocumentNumber(row.documentNumber),
          id: row.id,
          outstandingMinor: row.outstandingMinor.toString(),
          totalMinor: row.totalMinor.toString()
        };
      }),
      limit,
      (row) => encodeDocumentCursor({ documentDate: row.documentDate, id: row.id })
    );

    return {
      nextCursor: page.nextCursor,
      targets: page.pageRows
    };
  }

  const rows = await db
    .select({
      documentDate: purchaseDocument.purchaseDate,
      documentKind: purchaseDocument.documentKind,
      documentNumber: purchaseDocument.documentNumber,
      id: purchaseDocument.id,
      outstandingMinor: purchaseDocument.outstandingMinor,
      totalMinor: purchaseDocument.totalMinor
    })
    .from(purchaseDocument)
    .where(
      and(
        eq(purchaseDocument.organizationId, input.organizationId),
        eq(purchaseDocument.vendorPartyId, input.partyId),
        eq(purchaseDocument.status, "posted"),
        gt(purchaseDocument.outstandingMinor, 0n),
        beforeDocumentCursor(purchaseDocument.purchaseDate, purchaseDocument.id, cursor)
      )
    )
    .orderBy(desc(purchaseDocument.purchaseDate), desc(purchaseDocument.id))
    .limit(limit + 1);

  const page = createCursorPage(
    rows.map((row) => {
      return {
        documentDate: row.documentDate,
        documentKind: row.documentKind,
        documentNumber: requireDocumentNumber(row.documentNumber),
        id: row.id,
        outstandingMinor: row.outstandingMinor.toString(),
        totalMinor: row.totalMinor.toString()
      };
    }),
    limit,
    (row) => encodeDocumentCursor({ documentDate: row.documentDate, id: row.id })
  );

  return {
    nextCursor: page.nextCursor,
    targets: page.pageRows
  };
}

function requireDocumentNumber(value: string | null): string {
  if (!value) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }

  return value;
}

function beforeDocumentCursor(
  dateColumn: SQLWrapper,
  idColumn: SQLWrapper,
  cursor: DateIdCursor | null
) {
  return cursor
    ? sql`(${dateColumn}, ${idColumn}) < (${cursor.documentDate}, ${cursor.id})`
    : undefined;
}
