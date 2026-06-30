import {
  computeLineTotalMinor,
  type AllocatableDocumentKind,
  type PurchaseDocument,
  type PurchaseDocumentLineInput,
  type SalesDocument,
  type SalesDocumentLineInput,
  type SettlementDocument
} from "@tsu-stack/core/documents";

import {
  type purchaseDocument,
  type purchaseDocumentLine,
  type salesDocument,
  type salesDocumentLine,
  type settlementAllocation,
  type settlementDocument
} from "#@/schema/documents";
import { createUuidV7 } from "#@/utils/id";

import { DocumentDbError } from "./errors";

type SettlementAllocationDtoInput = Pick<
  typeof settlementAllocation.$inferSelect,
  "amountMinor" | "id" | "purchaseDocumentId" | "salesDocumentId" | "targetDocumentKind"
> & {
  targetDocumentNumber?: string | null;
};

export function toSalesDocumentLineValues(input: {
  documentId: string;
  lines: ReadonlyArray<SalesDocumentLineInput>;
  organizationId: string;
}) {
  return input.lines.map((line, index) => {
    const totalMinor = calculateLineTotalMinor(line.quantity, line.rateMinor);

    return {
      createdAt: new Date(),
      description: line.description.trim(),
      id: createUuidV7(),
      incomeAccountId: line.incomeAccountId,
      itemId: line.itemId ?? null,
      lineNumber: index + 1,
      organizationId: input.organizationId,
      quantity: normalizeQuantityForDb(line.quantity),
      rateMinor: BigInt(line.rateMinor),
      hsnCode: line.hsnCode ?? null,
      salesDocumentId: input.documentId,
      totalMinor,
      unit: line.unit ?? null
    };
  });
}

export function toPurchaseDocumentLineValues(input: {
  documentId: string;
  lines: ReadonlyArray<PurchaseDocumentLineInput>;
  organizationId: string;
}) {
  return input.lines.map((line, index) => {
    const totalMinor = calculateLineTotalMinor(line.quantity, line.rateMinor);

    return {
      createdAt: new Date(),
      description: line.description.trim(),
      expenseAccountId: line.expenseAccountId,
      id: createUuidV7(),
      itemId: line.itemId ?? null,
      lineNumber: index + 1,
      organizationId: input.organizationId,
      purchaseDocumentId: input.documentId,
      quantity: normalizeQuantityForDb(line.quantity),
      hsnCode: line.hsnCode ?? null,
      rateMinor: BigInt(line.rateMinor),
      totalMinor,
      unit: line.unit ?? null
    };
  });
}

export function toSalesDocumentDto(
  row: typeof salesDocument.$inferSelect & { customerPartyName?: string | null },
  lines: (typeof salesDocumentLine.$inferSelect)[]
): SalesDocument {
  return {
    customerPartyId: row.customerPartyId,
    customerPartyName: row.customerPartyName ?? undefined,
    documentKind: "sales_invoice",
    documentNumber: row.documentNumber,
    draftReference: row.draftReference,
    dueDate: row.dueDate,
    id: row.id,
    invoiceDate: row.invoiceDate,
    journalEntryId: row.journalEntryId,
    lines: lines.map((line) => {
      return {
        description: line.description,
        hsnCode: line.hsnCode,
        id: line.id,
        incomeAccountId: line.incomeAccountId,
        itemId: line.itemId,
        quantity: normalizeQuantityOutput(line.quantity),
        rateMinor: line.rateMinor.toString(),
        totalMinor: line.totalMinor.toString(),
        unit: line.unit
      };
    }),
    notes: row.notes,
    organizationId: row.organizationId,
    outstandingMinor: row.outstandingMinor.toString(),
    postedAt: row.postedAt?.toISOString() ?? null,
    postedByUserId: row.postedByUserId,
    status: row.status,
    terms: row.terms,
    totalMinor: row.totalMinor.toString(),
    voidReason: row.voidReason,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidedByUserId: row.voidedByUserId
  };
}

export function toPurchaseDocumentDto(
  row: typeof purchaseDocument.$inferSelect & { vendorPartyName?: string | null },
  lines: (typeof purchaseDocumentLine.$inferSelect)[]
): PurchaseDocument {
  return {
    documentKind: row.documentKind,
    documentNumber: row.documentNumber,
    draftReference: row.draftReference,
    dueDate: row.dueDate,
    id: row.id,
    journalEntryId: row.journalEntryId,
    lines: lines.map((line) => {
      return {
        description: line.description,
        expenseAccountId: line.expenseAccountId,
        hsnCode: line.hsnCode,
        id: line.id,
        itemId: line.itemId,
        quantity: normalizeQuantityOutput(line.quantity),
        rateMinor: line.rateMinor.toString(),
        totalMinor: line.totalMinor.toString(),
        unit: line.unit
      };
    }),
    notes: row.notes,
    organizationId: row.organizationId,
    outstandingMinor: row.outstandingMinor.toString(),
    postedAt: row.postedAt?.toISOString() ?? null,
    postedByUserId: row.postedByUserId,
    purchaseDate: row.purchaseDate,
    status: row.status,
    totalMinor: row.totalMinor.toString(),
    vendorPartyId: row.vendorPartyId,
    vendorPartyName: row.vendorPartyName ?? undefined,
    vendorReferenceNumber: row.vendorReferenceNumber,
    voidReason: row.voidReason,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidedByUserId: row.voidedByUserId
  };
}

export function toSettlementDocumentDto(
  row: typeof settlementDocument.$inferSelect & { partyName?: string | null },
  allocations: SettlementAllocationDtoInput[]
): SettlementDocument {
  return {
    allocations: allocations.map((allocation) => {
      return {
        amountMinor: allocation.amountMinor.toString(),
        id: allocation.id,
        targetDocumentId: targetDocumentId(allocation),
        targetDocumentKind: allocation.targetDocumentKind,
        targetDocumentNumber: allocation.targetDocumentNumber ?? null
      };
    }),
    amountMinor: row.amountMinor.toString(),
    cashAccountId: row.cashAccountId,
    direction: row.direction,
    documentKind: "settlement",
    documentNumber: row.documentNumber,
    draftReference: row.draftReference,
    id: row.id,
    journalEntryId: row.journalEntryId,
    notes: row.notes,
    organizationId: row.organizationId,
    partyId: row.partyId,
    partyName: row.partyName ?? undefined,
    paymentMode: row.paymentMode,
    postedAt: row.postedAt?.toISOString() ?? null,
    postedByUserId: row.postedByUserId,
    reference: row.reference,
    settlementDate: row.settlementDate,
    status: row.status,
    voidReason: row.voidReason,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidedByUserId: row.voidedByUserId
  };
}

export function toSettlementAllocationInsert(input: {
  allocation: {
    amountMinor: string;
    targetDocumentId: string;
    targetDocumentKind: AllocatableDocumentKind;
  };
  organizationId: string;
  settlementDocumentId: string;
}) {
  return {
    amountMinor: BigInt(input.allocation.amountMinor),
    createdAt: new Date(),
    id: createUuidV7(),
    organizationId: input.organizationId,
    purchaseDocumentId:
      input.allocation.targetDocumentKind === "sales_invoice"
        ? null
        : input.allocation.targetDocumentId,
    salesDocumentId:
      input.allocation.targetDocumentKind === "sales_invoice"
        ? input.allocation.targetDocumentId
        : null,
    settlementDocumentId: input.settlementDocumentId,
    targetDocumentKind: input.allocation.targetDocumentKind
  };
}

export function targetDocumentId(
  allocation: Pick<
    typeof settlementAllocation.$inferSelect,
    "purchaseDocumentId" | "salesDocumentId" | "targetDocumentKind"
  >
): string {
  return allocation.targetDocumentKind === "sales_invoice"
    ? requiredTargetId(allocation.salesDocumentId)
    : requiredTargetId(allocation.purchaseDocumentId);
}

export function requiredTargetId(value: string | null): string {
  if (!value) {
    throw new DocumentDbError("DOCUMENT_ALLOCATION_INVALID");
  }

  return value;
}

function calculateLineTotalMinor(quantity: string, rateMinor: string): bigint {
  const total = computeLineTotalMinor(quantity, rateMinor);

  if (total <= 0n) {
    throw new DocumentDbError("DOCUMENT_LINE_INVALID");
  }

  return total;
}

function normalizeQuantityForDb(value: string): string {
  const [whole, fraction = ""] = value.split(".");

  return `${whole}.${fraction.padEnd(6, "0")}`;
}

function normalizeQuantityOutput(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export function draftReferenceFor(documentId: string): string {
  return `DRAFT-${documentId.replaceAll("-", "").slice(-12).toUpperCase()}`;
}

export function documentLabel(kind: "expense" | "purchase_bill"): string {
  return kind === "purchase_bill" ? "Purchase bill" : "Expense";
}
