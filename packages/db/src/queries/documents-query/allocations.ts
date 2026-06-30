import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { type AllocatableDocumentKind } from "@tsu-stack/core/documents";

import { type TransactionClient } from "#@/client";
import { purchaseDocument, salesDocument, type settlementAllocation } from "#@/schema/documents";

import { DocumentDbError } from "./errors";
import { targetDocumentId } from "./shared";

type SettlementAllocationRow = Pick<
  typeof settlementAllocation.$inferSelect,
  "amountMinor" | "purchaseDocumentId" | "salesDocumentId" | "targetDocumentKind"
>;
type SettlementAllocationTarget = {
  amountMinor: bigint;
  targetDocumentId: string;
  targetDocumentKind: AllocatableDocumentKind;
};

type SalesAllocationTarget = SettlementAllocationTarget & {
  targetDocumentKind: "sales_invoice";
};

type PurchaseAllocationTarget = SettlementAllocationTarget & {
  targetDocumentKind: "purchase_bill" | "expense";
};

export async function assertSettlementAllocationTargets(
  tx: TransactionClient,
  input: {
    allocations: SettlementAllocationTarget[];
    direction: "paid" | "received";
    organizationId: string;
    partyId: string;
  }
) {
  const targets = splitSettlementAllocationTargets(input);

  if (targets.sales.length > 0) {
    await assertSalesAllocationTargets(tx, {
      allocations: targets.sales,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }

  if (targets.purchase.length > 0) {
    await assertPurchaseAllocationTargets(tx, {
      allocations: targets.purchase,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }
}

export async function applySettlementAllocations(
  tx: TransactionClient,
  input: {
    allocations: SettlementAllocationRow[];
    direction: "paid" | "received";
    multiplier: -1n | 1n;
    organizationId: string;
    partyId: string;
  }
) {
  const allocatedMinor = input.allocations.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0n
  );

  if (allocatedMinor === 0n) {
    return;
  }

  const targets = splitSettlementAllocationTargets({
    allocations: input.allocations.map((allocation) => {
      return {
        amountMinor: allocation.amountMinor,
        targetDocumentId: targetDocumentId(allocation),
        targetDocumentKind: allocation.targetDocumentKind
      };
    }),
    direction: input.direction
  });

  if (targets.sales.length > 0) {
    await applySalesAllocations(tx, {
      allocations: targets.sales,
      multiplier: input.multiplier,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }

  if (targets.purchase.length > 0) {
    await applyPurchaseAllocations(tx, {
      allocations: targets.purchase,
      multiplier: input.multiplier,
      organizationId: input.organizationId,
      partyId: input.partyId
    });
  }
}

async function assertSalesAllocationTargets(
  tx: TransactionClient,
  input: {
    allocations: SalesAllocationTarget[];
    organizationId: string;
    partyId: string;
  }
) {
  const rows = await tx
    .select({
      customerPartyId: salesDocument.customerPartyId,
      id: salesDocument.id,
      outstandingMinor: salesDocument.outstandingMinor,
      status: salesDocument.status
    })
    .from(salesDocument)
    .where(
      and(
        inArray(
          salesDocument.id,
          input.allocations.map((allocation) => allocation.targetDocumentId)
        ),
        eq(salesDocument.organizationId, input.organizationId)
      )
    );
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  for (const allocation of input.allocations) {
    const row = rowsById.get(allocation.targetDocumentId);

    if (
      !row ||
      row.status !== "posted" ||
      row.customerPartyId !== input.partyId ||
      row.outstandingMinor < allocation.amountMinor
    ) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }
  }
}

async function applySalesAllocations(
  tx: TransactionClient,
  input: {
    allocations: SalesAllocationTarget[];
    multiplier: -1n | 1n;
    organizationId: string;
    partyId: string;
  }
) {
  const rows = await tx
    .select({
      customerPartyId: salesDocument.customerPartyId,
      id: salesDocument.id,
      outstandingMinor: salesDocument.outstandingMinor,
      status: salesDocument.status,
      totalMinor: salesDocument.totalMinor
    })
    .from(salesDocument)
    .where(
      and(
        inArray(
          salesDocument.id,
          input.allocations.map((allocation) => allocation.targetDocumentId)
        ),
        eq(salesDocument.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(salesDocument.id))
    .for("update");
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const nextOutstandingById = new Map<string, bigint>();

  for (const allocation of input.allocations) {
    const row = rowsById.get(allocation.targetDocumentId);

    if (!row || row.status !== "posted" || row.customerPartyId !== input.partyId) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    const nextOutstanding = row.outstandingMinor + allocation.amountMinor * input.multiplier;

    if (nextOutstanding < 0n || nextOutstanding > row.totalMinor) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    nextOutstandingById.set(allocation.targetDocumentId, nextOutstanding);
  }

  await tx
    .update(salesDocument)
    .set({
      outstandingMinor: sql`case ${salesDocument.id} ${sql.join(
        Array.from(
          nextOutstandingById,
          ([id, nextOutstanding]) => sql`when ${id} then ${nextOutstanding}`
        ),
        sql` `
      )} else ${salesDocument.outstandingMinor} end`,
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(salesDocument.id, Array.from(nextOutstandingById.keys())),
        eq(salesDocument.organizationId, input.organizationId)
      )
    );
}

async function assertPurchaseAllocationTargets(
  tx: TransactionClient,
  input: {
    allocations: PurchaseAllocationTarget[];
    organizationId: string;
    partyId: string;
  }
) {
  const rows = await tx
    .select({
      documentKind: purchaseDocument.documentKind,
      id: purchaseDocument.id,
      outstandingMinor: purchaseDocument.outstandingMinor,
      status: purchaseDocument.status,
      vendorPartyId: purchaseDocument.vendorPartyId
    })
    .from(purchaseDocument)
    .where(
      and(
        inArray(
          purchaseDocument.id,
          input.allocations.map((allocation) => allocation.targetDocumentId)
        ),
        eq(purchaseDocument.organizationId, input.organizationId)
      )
    );
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  for (const allocation of input.allocations) {
    const row = rowsById.get(allocation.targetDocumentId);

    if (
      !row ||
      row.documentKind !== allocation.targetDocumentKind ||
      row.status !== "posted" ||
      row.vendorPartyId !== input.partyId ||
      row.outstandingMinor < allocation.amountMinor
    ) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }
  }
}

async function applyPurchaseAllocations(
  tx: TransactionClient,
  input: {
    allocations: PurchaseAllocationTarget[];
    multiplier: -1n | 1n;
    organizationId: string;
    partyId: string;
  }
) {
  const rows = await tx
    .select({
      documentKind: purchaseDocument.documentKind,
      id: purchaseDocument.id,
      outstandingMinor: purchaseDocument.outstandingMinor,
      status: purchaseDocument.status,
      totalMinor: purchaseDocument.totalMinor,
      vendorPartyId: purchaseDocument.vendorPartyId
    })
    .from(purchaseDocument)
    .where(
      and(
        inArray(
          purchaseDocument.id,
          input.allocations.map((allocation) => allocation.targetDocumentId)
        ),
        eq(purchaseDocument.organizationId, input.organizationId)
      )
    )
    .orderBy(asc(purchaseDocument.id))
    .for("update");
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const nextOutstandingById = new Map<string, bigint>();

  for (const allocation of input.allocations) {
    const row = rowsById.get(allocation.targetDocumentId);

    if (
      !row ||
      row.documentKind !== allocation.targetDocumentKind ||
      row.status !== "posted" ||
      row.vendorPartyId !== input.partyId
    ) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    const nextOutstanding = row.outstandingMinor + allocation.amountMinor * input.multiplier;

    if (nextOutstanding < 0n || nextOutstanding > row.totalMinor) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    nextOutstandingById.set(allocation.targetDocumentId, nextOutstanding);
  }

  await tx
    .update(purchaseDocument)
    .set({
      outstandingMinor: sql`case ${purchaseDocument.id} ${sql.join(
        Array.from(
          nextOutstandingById,
          ([id, nextOutstanding]) => sql`when ${id} then ${nextOutstanding}`
        ),
        sql` `
      )} else ${purchaseDocument.outstandingMinor} end`,
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(purchaseDocument.id, Array.from(nextOutstandingById.keys())),
        eq(purchaseDocument.organizationId, input.organizationId)
      )
    );
}

function splitSettlementAllocationTargets(input: {
  allocations: SettlementAllocationTarget[];
  direction: "paid" | "received";
}): { purchase: PurchaseAllocationTarget[]; sales: SalesAllocationTarget[] } {
  const seenTargets = new Set<string>();
  const purchase: PurchaseAllocationTarget[] = [];
  const sales: SalesAllocationTarget[] = [];

  for (const allocation of input.allocations) {
    if (input.direction === "received" && allocation.targetDocumentKind !== "sales_invoice") {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    if (input.direction === "paid" && allocation.targetDocumentKind === "sales_invoice") {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }

    if (seenTargets.has(allocation.targetDocumentId)) {
      throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
    }
    seenTargets.add(allocation.targetDocumentId);

    if (allocation.targetDocumentKind === "sales_invoice") {
      sales.push({
        amountMinor: allocation.amountMinor,
        targetDocumentId: allocation.targetDocumentId,
        targetDocumentKind: "sales_invoice"
      });
    } else {
      purchase.push({
        amountMinor: allocation.amountMinor,
        targetDocumentId: allocation.targetDocumentId,
        targetDocumentKind: allocation.targetDocumentKind
      });
    }
  }

  sales.sort((left, right) => left.targetDocumentId.localeCompare(right.targetDocumentId));
  purchase.sort((left, right) => left.targetDocumentId.localeCompare(right.targetDocumentId));

  return { purchase, sales };
}
