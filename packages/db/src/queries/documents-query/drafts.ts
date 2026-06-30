import { and, eq } from "drizzle-orm";

import {
  type PostedDocument,
  type PurchaseDocument,
  type SalesDocument,
  type SettlementDocument
} from "@tsu-stack/core/documents";

import { type Database, type TransactionClient } from "#@/client";
import {
  purchaseDocument,
  purchaseDocumentLine,
  salesDocument,
  salesDocumentLine,
  settlementAllocation,
  settlementDocument
} from "#@/schema/documents";
import { createUuidV7 } from "#@/utils/id";

import { assertSettlementAllocationTargets } from "./allocations";
import { DocumentDbError } from "./errors";
import {
  postPurchaseDocumentDraft,
  postSalesDocumentDraft,
  postSettlementDocumentDraft,
  type PurchasePostingDocument,
  type SalesPostingDocument,
  type SettlementPostingDocument
} from "./posting";
import {
  getPurchaseDocumentInTransaction,
  getSalesDocumentInTransaction,
  getSettlementDocumentInTransaction
} from "./read-model";
import {
  draftReferenceFor,
  targetDocumentId,
  toPurchaseDocumentDto,
  toPurchaseDocumentLineValues,
  toSalesDocumentDto,
  toSalesDocumentLineValues,
  toSettlementDocumentDto,
  toSettlementAllocationInsert
} from "./shared";
import {
  type CreatePurchaseDocumentDraftDbInput,
  type CreateSalesDocumentDraftDbInput,
  type CreateSettlementDraftDbInput,
  type CreateAndPostPurchaseDocumentDbInput,
  type CreateAndPostSalesDocumentDbInput,
  type CreateAndPostSettlementDbInput,
  type GetPurchaseDocumentDbInput,
  type GetSalesDocumentDbInput,
  type GetSettlementDbInput,
  type UpdateAndPostPurchaseDocumentDbInput,
  type UpdateAndPostSalesDocumentDbInput,
  type UpdateAndPostSettlementDbInput,
  type UpdatePurchaseDocumentDraftDbInput,
  type UpdateSalesDocumentDraftDbInput,
  type UpdateSettlementDraftDbInput
} from "./types";

type SalesDraftWriteResult = {
  document: SalesDocument;
  postingDocument: SalesPostingDocument;
};
type PurchaseDraftWriteResult = {
  document: PurchaseDocument;
  postingDocument: PurchasePostingDocument;
};
type SettlementDraftWriteResult = {
  document: SettlementDocument;
  postingDocument: SettlementPostingDocument;
};

export async function createSalesDocumentDraft(
  db: Database,
  input: CreateSalesDocumentDraftDbInput
): Promise<SalesDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertSalesDocumentDraftInTransaction(tx, { ...input, documentId });
    return result.document;
  });
}

export async function createAndPostSalesDocument(
  db: Database,
  input: CreateAndPostSalesDocumentDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertSalesDocumentDraftInTransaction(tx, {
      ...input,
      documentId
    });
    return postSalesDocumentDraft(
      tx,
      {
        documentId,
        documentKind: "sales_invoice",
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

async function insertSalesDocumentDraftInTransaction(
  tx: TransactionClient,
  input: CreateSalesDocumentDraftDbInput & { documentId: string }
): Promise<SalesDraftWriteResult> {
  const lineValues = toSalesDocumentLineValues({
    documentId: input.documentId,
    lines: input.lines,
    organizationId: input.organizationId
  });
  const totalMinor = lineValues.reduce((sum, line) => sum + line.totalMinor, 0n);

  const draftReference = draftReferenceFor(input.documentId);

  const [documentRow] = await tx
    .insert(salesDocument)
    .values({
      customerPartyId: input.customerPartyId,
      draftReference,
      dueDate: input.dueDate ?? null,
      id: input.documentId,
      invoiceDate: input.invoiceDate,
      notes: input.notes ?? null,
      organizationId: input.organizationId,
      terms: input.terms ?? null,
      totalMinor
    })
    .returning();
  assertDraftMutationApplied(documentRow);

  await tx.insert(salesDocumentLine).values(lineValues);

  const postingDocument = {
    invoiceDate: input.invoiceDate,
    lines: lineValues.map((line) => {
      return {
        description: line.description,
        incomeAccountId: line.incomeAccountId,
        totalMinor: line.totalMinor
      };
    }),
    totalMinor
  };

  return {
    document: toSalesDocumentDto(documentRow, lineValues),
    postingDocument
  };
}

export async function updateSalesDocumentDraft(
  db: Database,
  input: UpdateSalesDocumentDraftDbInput
): Promise<SalesDocument> {
  return db.transaction(async (tx) => {
    const result = await replaceSalesDocumentDraftInTransaction(tx, input);
    return result.document;
  });
}

async function replaceSalesDocumentDraftInTransaction(
  tx: TransactionClient,
  input: UpdateSalesDocumentDraftDbInput
): Promise<SalesDraftWriteResult> {
  const lineValues = toSalesDocumentLineValues({
    documentId: input.documentId,
    lines: input.lines,
    organizationId: input.organizationId
  });
  const totalMinor = lineValues.reduce((sum, line) => sum + line.totalMinor, 0n);

  const now = new Date();
  const [updated] = await tx
    .update(salesDocument)
    .set({
      customerPartyId: input.customerPartyId,
      dueDate: input.dueDate ?? null,
      invoiceDate: input.invoiceDate,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      totalMinor,
      updatedAt: now
    })
    .where(
      and(
        eq(salesDocument.id, input.documentId),
        eq(salesDocument.organizationId, input.organizationId),
        eq(salesDocument.status, "draft")
      )
    )
    .returning();
  assertDraftMutationApplied(updated);

  await tx
    .delete(salesDocumentLine)
    .where(
      and(
        eq(salesDocumentLine.salesDocumentId, input.documentId),
        eq(salesDocumentLine.organizationId, input.organizationId)
      )
    );
  await tx.insert(salesDocumentLine).values(lineValues);

  const postingDocument = {
    invoiceDate: input.invoiceDate,
    lines: lineValues.map((line) => {
      return {
        description: line.description,
        incomeAccountId: line.incomeAccountId,
        totalMinor: line.totalMinor
      };
    }),
    totalMinor
  };

  return {
    document: toSalesDocumentDto(updated, lineValues),
    postingDocument
  };
}

export async function updateAndPostSalesDocument(
  db: Database,
  input: UpdateAndPostSalesDocumentDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const result = await replaceSalesDocumentDraftInTransaction(tx, input);
    return postSalesDocumentDraft(
      tx,
      {
        documentId: input.documentId,
        documentKind: "sales_invoice",
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

export async function getSalesDocument(
  db: Database,
  input: GetSalesDocumentDbInput
): Promise<SalesDocument> {
  return db.transaction(async (tx) => getSalesDocumentInTransaction(tx, input));
}

export async function getPurchaseDocument(
  db: Database,
  input: GetPurchaseDocumentDbInput
): Promise<PurchaseDocument> {
  return db.transaction(async (tx) => getPurchaseDocumentInTransaction(tx, input));
}

export async function getSettlementDocument(
  db: Database,
  input: GetSettlementDbInput
): Promise<SettlementDocument> {
  return db.transaction(async (tx) => getSettlementDocumentInTransaction(tx, input));
}

export async function createPurchaseDocumentDraft(
  db: Database,
  input: CreatePurchaseDocumentDraftDbInput
): Promise<PurchaseDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertPurchaseDocumentDraftInTransaction(tx, { ...input, documentId });
    return result.document;
  });
}

export async function createAndPostPurchaseDocument(
  db: Database,
  input: CreateAndPostPurchaseDocumentDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertPurchaseDocumentDraftInTransaction(tx, {
      ...input,
      documentId
    });
    return postPurchaseDocumentDraft(
      tx,
      {
        documentId,
        documentKind: input.documentKind,
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

async function insertPurchaseDocumentDraftInTransaction(
  tx: TransactionClient,
  input: CreatePurchaseDocumentDraftDbInput & { documentId: string }
): Promise<PurchaseDraftWriteResult> {
  const lineValues = toPurchaseDocumentLineValues({
    documentId: input.documentId,
    lines: input.lines,
    organizationId: input.organizationId
  });
  const totalMinor = lineValues.reduce((sum, line) => sum + line.totalMinor, 0n);

  const draftReference = draftReferenceFor(input.documentId);

  const [documentRow] = await tx
    .insert(purchaseDocument)
    .values({
      documentKind: input.documentKind,
      draftReference,
      dueDate: input.dueDate ?? null,
      id: input.documentId,
      notes: input.notes ?? null,
      organizationId: input.organizationId,
      purchaseDate: input.purchaseDate,
      totalMinor,
      vendorPartyId: input.vendorPartyId,
      vendorReferenceNumber: input.vendorReferenceNumber ?? null
    })
    .returning();
  assertDraftMutationApplied(documentRow);

  await tx.insert(purchaseDocumentLine).values(lineValues);

  const postingDocument = {
    documentKind: input.documentKind,
    lines: lineValues.map((line) => {
      return {
        description: line.description,
        expenseAccountId: line.expenseAccountId,
        totalMinor: line.totalMinor
      };
    }),
    purchaseDate: input.purchaseDate,
    totalMinor
  };

  return {
    document: toPurchaseDocumentDto(documentRow, lineValues),
    postingDocument
  };
}

export async function updatePurchaseDocumentDraft(
  db: Database,
  input: UpdatePurchaseDocumentDraftDbInput
): Promise<PurchaseDocument> {
  return db.transaction(async (tx) => {
    const result = await replacePurchaseDocumentDraftInTransaction(tx, input);
    return result.document;
  });
}

export async function updateAndPostPurchaseDocument(
  db: Database,
  input: UpdateAndPostPurchaseDocumentDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const result = await replacePurchaseDocumentDraftInTransaction(tx, input);
    return postPurchaseDocumentDraft(
      tx,
      {
        documentId: input.documentId,
        documentKind: input.documentKind,
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

async function replacePurchaseDocumentDraftInTransaction(
  tx: TransactionClient,
  input: UpdatePurchaseDocumentDraftDbInput
): Promise<PurchaseDraftWriteResult> {
  const lineValues = toPurchaseDocumentLineValues({
    documentId: input.documentId,
    lines: input.lines,
    organizationId: input.organizationId
  });
  const totalMinor = lineValues.reduce((sum, line) => sum + line.totalMinor, 0n);

  const now = new Date();
  const [updated] = await tx
    .update(purchaseDocument)
    .set({
      documentKind: input.documentKind,
      dueDate: input.dueDate ?? null,
      notes: input.notes ?? null,
      purchaseDate: input.purchaseDate,
      totalMinor,
      updatedAt: now,
      vendorPartyId: input.vendorPartyId,
      vendorReferenceNumber: input.vendorReferenceNumber ?? null
    })
    .where(
      and(
        eq(purchaseDocument.id, input.documentId),
        eq(purchaseDocument.organizationId, input.organizationId),
        eq(purchaseDocument.status, "draft")
      )
    )
    .returning();
  assertDraftMutationApplied(updated);

  await tx
    .delete(purchaseDocumentLine)
    .where(
      and(
        eq(purchaseDocumentLine.purchaseDocumentId, input.documentId),
        eq(purchaseDocumentLine.organizationId, input.organizationId)
      )
    );
  await tx.insert(purchaseDocumentLine).values(lineValues);

  const postingDocument = {
    documentKind: input.documentKind,
    lines: lineValues.map((line) => {
      return {
        description: line.description,
        expenseAccountId: line.expenseAccountId,
        totalMinor: line.totalMinor
      };
    }),
    purchaseDate: input.purchaseDate,
    totalMinor
  };

  return {
    document: toPurchaseDocumentDto(updated, lineValues),
    postingDocument
  };
}

export async function createSettlementDraft(
  db: Database,
  input: CreateSettlementDraftDbInput
): Promise<SettlementDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertSettlementDraftInTransaction(
      tx,
      { ...input, documentId },
      { validateTargets: true }
    );
    return result.document;
  });
}

export async function createAndPostSettlement(
  db: Database,
  input: CreateAndPostSettlementDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const documentId = createUuidV7();
    const result = await insertSettlementDraftInTransaction(
      tx,
      {
        ...input,
        documentId
      },
      { validateTargets: false }
    );
    return postSettlementDocumentDraft(
      tx,
      {
        documentId,
        documentKind: "settlement",
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

async function insertSettlementDraftInTransaction(
  tx: TransactionClient,
  input: CreateSettlementDraftDbInput & { documentId: string },
  options: { validateTargets: boolean }
): Promise<SettlementDraftWriteResult> {
  const amountMinor = BigInt(input.amountMinor);
  const allocationValues = input.allocations.map((allocation) =>
    toSettlementAllocationInsert({
      allocation,
      organizationId: input.organizationId,
      settlementDocumentId: input.documentId
    })
  );
  const allocatedMinor = allocationValues.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0n
  );

  assertSettlementFullyAllocated(amountMinor, allocatedMinor);
  if (options.validateTargets) {
    await assertSettlementAllocationTargets(tx, {
      allocations: allocationValues.map((allocation) => {
        return {
          amountMinor: allocation.amountMinor,
          targetDocumentId: targetDocumentId(allocation),
          targetDocumentKind: allocation.targetDocumentKind
        };
      }),
      direction: input.direction,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }

  const draftReference = draftReferenceFor(input.documentId);

  const [documentRow] = await tx
    .insert(settlementDocument)
    .values({
      amountMinor,
      cashAccountId: input.cashAccountId,
      direction: input.direction,
      draftReference,
      id: input.documentId,
      notes: input.notes ?? null,
      organizationId: input.organizationId,
      partyId: input.partyId,
      paymentMode: input.paymentMode,
      reference: input.reference ?? null,
      settlementDate: input.settlementDate
    })
    .returning();
  assertDraftMutationApplied(documentRow);

  if (allocationValues.length > 0) {
    await tx.insert(settlementAllocation).values(allocationValues);
  }

  const postingDocument = {
    allocations: allocationValues.map((allocation) => {
      return {
        amountMinor: allocation.amountMinor,
        purchaseDocumentId: allocation.purchaseDocumentId ?? null,
        salesDocumentId: allocation.salesDocumentId ?? null,
        targetDocumentKind: allocation.targetDocumentKind
      };
    }),
    amountMinor,
    cashAccountId: input.cashAccountId,
    direction: input.direction,
    partyId: input.partyId,
    settlementDate: input.settlementDate
  };

  return {
    document: toSettlementDocumentDto(documentRow, allocationValues),
    postingDocument
  };
}

export async function updateSettlementDraft(
  db: Database,
  input: UpdateSettlementDraftDbInput
): Promise<SettlementDocument> {
  return db.transaction(async (tx) => {
    const result = await replaceSettlementDraftInTransaction(tx, input, {
      validateTargets: true
    });
    return result.document;
  });
}

export async function updateAndPostSettlement(
  db: Database,
  input: UpdateAndPostSettlementDbInput
): Promise<PostedDocument> {
  return db.transaction(async (tx) => {
    const result = await replaceSettlementDraftInTransaction(tx, input, {
      validateTargets: false
    });
    return postSettlementDocumentDraft(
      tx,
      {
        documentId: input.documentId,
        documentKind: "settlement",
        organizationId: input.organizationId,
        userId: input.userId
      },
      result.postingDocument
    );
  });
}

async function replaceSettlementDraftInTransaction(
  tx: TransactionClient,
  input: UpdateSettlementDraftDbInput,
  options: { validateTargets: boolean }
): Promise<SettlementDraftWriteResult> {
  const amountMinor = BigInt(input.amountMinor);
  const allocationValues = input.allocations.map((allocation) =>
    toSettlementAllocationInsert({
      allocation,
      organizationId: input.organizationId,
      settlementDocumentId: input.documentId
    })
  );
  const allocatedMinor = allocationValues.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0n
  );

  assertSettlementFullyAllocated(amountMinor, allocatedMinor);
  if (options.validateTargets) {
    await assertSettlementAllocationTargets(tx, {
      allocations: allocationValues.map((allocation) => {
        return {
          amountMinor: allocation.amountMinor,
          targetDocumentId: targetDocumentId(allocation),
          targetDocumentKind: allocation.targetDocumentKind
        };
      }),
      direction: input.direction,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }

  const now = new Date();
  const [updated] = await tx
    .update(settlementDocument)
    .set({
      amountMinor,
      cashAccountId: input.cashAccountId,
      direction: input.direction,
      notes: input.notes ?? null,
      partyId: input.partyId,
      paymentMode: input.paymentMode,
      reference: input.reference ?? null,
      settlementDate: input.settlementDate,
      updatedAt: now
    })
    .where(
      and(
        eq(settlementDocument.id, input.documentId),
        eq(settlementDocument.organizationId, input.organizationId),
        eq(settlementDocument.status, "draft")
      )
    )
    .returning();
  assertDraftMutationApplied(updated);

  await tx
    .delete(settlementAllocation)
    .where(
      and(
        eq(settlementAllocation.settlementDocumentId, input.documentId),
        eq(settlementAllocation.organizationId, input.organizationId)
      )
    );

  if (allocationValues.length > 0) {
    await tx.insert(settlementAllocation).values(allocationValues);
  }

  const postingDocument = {
    allocations: allocationValues.map((allocation) => {
      return {
        amountMinor: allocation.amountMinor,
        purchaseDocumentId: allocation.purchaseDocumentId ?? null,
        salesDocumentId: allocation.salesDocumentId ?? null,
        targetDocumentKind: allocation.targetDocumentKind
      };
    }),
    amountMinor,
    cashAccountId: input.cashAccountId,
    direction: input.direction,
    partyId: input.partyId,
    settlementDate: input.settlementDate
  };

  return {
    document: toSettlementDocumentDto(updated, allocationValues),
    postingDocument
  };
}

function assertDraftMutationApplied<T extends { id: string }>(
  row: T | undefined
): asserts row is T {
  if (!row) {
    throw new DocumentDbError("DOCUMENT_NOT_FOUND");
  }
}

function assertSettlementFullyAllocated(amountMinor: bigint, allocatedMinor: bigint) {
  if (allocatedMinor !== amountMinor) {
    throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
  }
}
