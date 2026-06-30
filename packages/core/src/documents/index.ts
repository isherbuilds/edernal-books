import { z } from "zod";

import { NonNegativeMinorUnitStringSchema } from "#@/accounting/types";
import { computeDocumentTotalMinor } from "#@/documents/totals";
import { OrgSlugInputSchema } from "#@/organizations/index";
import { CursorPaginationInputSchema, CursorPaginationOutputSchema } from "#@/pagination";
import { nullableTextInput } from "#@/text/index";

export { computeDocumentTotalMinor, computeLineTotalMinor } from "#@/documents/totals";

export const DOCUMENT_STATUSES = ["draft", "posted", "voided"] as const;
export const DOCUMENT_KINDS = ["sales_invoice", "purchase_bill", "expense", "settlement"] as const;
export const PURCHASE_DOCUMENT_KINDS = ["purchase_bill", "expense"] as const;
export const ALLOCATABLE_DOCUMENT_KINDS = ["sales_invoice", "purchase_bill", "expense"] as const;
export const SETTLEMENT_DIRECTIONS = ["received", "paid"] as const;
export const PAYMENT_MODES = ["cash", "bank_transfer", "upi", "card", "cheque", "other"] as const;
export const DOCUMENT_ERROR_CODES = [
  "DOCUMENT_ALLOCATION_INVALID",
  "DOCUMENT_DATE_INVALID",
  "DOCUMENT_ACCOUNT_INVALID",
  "DOCUMENT_ACCOUNT_ORGANIZATION_MISMATCH",
  "DOCUMENT_LINE_INVALID",
  "DOCUMENT_NOT_FOUND",
  "DOCUMENT_PERIOD_CLOSED"
] as const;

export const DocumentStatusSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const DocumentKindSchema = z.enum(DOCUMENT_KINDS);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const PurchaseDocumentKindSchema = z.enum(PURCHASE_DOCUMENT_KINDS);
export type PurchaseDocumentKind = z.infer<typeof PurchaseDocumentKindSchema>;

export const AllocatableDocumentKindSchema = z.enum(ALLOCATABLE_DOCUMENT_KINDS);
export type AllocatableDocumentKind = z.infer<typeof AllocatableDocumentKindSchema>;

export const SettlementDirectionSchema = z.enum(SETTLEMENT_DIRECTIONS);
export type SettlementDirection = z.infer<typeof SettlementDirectionSchema>;

export const PaymentModeSchema = z.enum(PAYMENT_MODES);
export type PaymentMode = z.infer<typeof PaymentModeSchema>;

export const DocumentErrorCodeSchema = z.enum(DOCUMENT_ERROR_CODES);
export type DocumentErrorCode = z.infer<typeof DocumentErrorCodeSchema>;

const PositiveMinorUnitStringSchema = NonNegativeMinorUnitStringSchema.refine(
  (value) => BigInt(value) > 0n
);
const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;
export const MAX_DOCUMENT_LINES = 200;

export const DocumentNumberSchema = z.string().trim().min(1).max(80);
export const DocumentDraftReferenceSchema = z.string().trim().min(1).max(80);
export const QuantityDecimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(?:\.\d{1,6})?$/)
  .refine((value) => /[1-9]/.test(value));

const DocumentLifecycleSchema = z
  .object({
    createdAt: z.iso.datetime().optional(),
    documentNumber: DocumentNumberSchema.nullable(),
    draftReference: DocumentDraftReferenceSchema,
    id: z.uuid(),
    journalEntryId: z.uuid().nullable(),
    organizationId: z.string().min(1),
    postedAt: z.iso.datetime().nullable(),
    postedByUserId: z.string().min(1).nullable(),
    status: DocumentStatusSchema,
    updatedAt: z.iso.datetime().optional(),
    voidReason: z.string().nullable(),
    voidedAt: z.iso.datetime().nullable(),
    voidedByUserId: z.string().min(1).nullable()
  })
  .strict();

const documentTextInput = nullableTextInput(z.string().trim().max(2000));
const shortTextInput = nullableTextInput(z.string().trim().max(240));

export const SalesDocumentLineInputSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    hsnCode: nullableTextInput(z.string().trim().max(40)),
    incomeAccountId: z.uuid(),
    itemId: z.uuid().nullable().optional(),
    quantity: QuantityDecimalStringSchema,
    rateMinor: PositiveMinorUnitStringSchema,
    unit: nullableTextInput(z.string().trim().max(40))
  })
  .strict();
export type SalesDocumentLineInput = z.infer<typeof SalesDocumentLineInputSchema>;

export const PurchaseDocumentLineInputSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    expenseAccountId: z.uuid(),
    hsnCode: nullableTextInput(z.string().trim().max(40)),
    itemId: z.uuid().nullable().optional(),
    quantity: QuantityDecimalStringSchema,
    rateMinor: PositiveMinorUnitStringSchema,
    unit: nullableTextInput(z.string().trim().max(40))
  })
  .strict();
export type PurchaseDocumentLineInput = z.infer<typeof PurchaseDocumentLineInputSchema>;

const withOptionalDueDateAfter = <
  T extends { dueDate?: string; invoiceDate?: string; purchaseDate?: string }
>(
  input: T
) => {
  const documentDate = input.invoiceDate ?? input.purchaseDate;
  return !input.dueDate || !documentDate || documentDate <= input.dueDate;
};

const documentTotalFitsInt8 = (input: {
  lines: ReadonlyArray<{ quantity: string; rateMinor: string }>;
}) => computeDocumentTotalMinor(input.lines) <= POSTGRES_BIGINT_MAX;

const settlementIsFullyAllocated = (input: {
  allocations: ReadonlyArray<{ amountMinor: string }>;
  amountMinor: string;
}) => {
  const allocatedMinor = input.allocations.reduce(
    (sum, allocation) => sum + BigInt(allocation.amountMinor),
    0n
  );

  return allocatedMinor === BigInt(input.amountMinor);
};

const settlementAllocationTargetsAreUnique = (input: {
  allocations: ReadonlyArray<{ targetDocumentId: string }>;
}) => {
  const targets = new Set<string>();

  for (const allocation of input.allocations) {
    if (targets.has(allocation.targetDocumentId)) {
      return false;
    }

    targets.add(allocation.targetDocumentId);
  }

  return true;
};

const salesDocumentDraftInputShape = {
  customerPartyId: z.uuid(),
  dueDate: z.iso.date().optional(),
  invoiceDate: z.iso.date(),
  lines: z.array(SalesDocumentLineInputSchema).min(1).max(MAX_DOCUMENT_LINES),
  notes: documentTextInput,
  terms: documentTextInput
};

type TradeDocumentDraftInput = {
  dueDate?: string;
  invoiceDate?: string;
  lines: ReadonlyArray<{ quantity: string; rateMinor: string }>;
  purchaseDate?: string;
};

function withTradeDocumentChecks<T extends z.ZodType<TradeDocumentDraftInput>>(schema: T) {
  return schema
    .refine(withOptionalDueDateAfter, {
      path: ["dueDate"]
    })
    .refine(documentTotalFitsInt8, {
      message: "Document total exceeds supported amount",
      path: ["lines"]
    });
}

export const CreateSalesDocumentDraftInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend(salesDocumentDraftInputShape).strict()
);
export type CreateSalesDocumentDraftInput = z.infer<typeof CreateSalesDocumentDraftInputSchema>;

export const CreateAndPostSalesDocumentInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend(salesDocumentDraftInputShape).strict()
);
export type CreateAndPostSalesDocumentInput = z.infer<typeof CreateAndPostSalesDocumentInputSchema>;

export const UpdateSalesDocumentDraftInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend({
    ...salesDocumentDraftInputShape,
    documentId: z.uuid()
  }).strict()
);
export type UpdateSalesDocumentDraftInput = z.infer<typeof UpdateSalesDocumentDraftInputSchema>;

const purchaseDocumentDraftInputShape = {
  documentKind: PurchaseDocumentKindSchema,
  dueDate: z.iso.date().optional(),
  lines: z.array(PurchaseDocumentLineInputSchema).min(1).max(MAX_DOCUMENT_LINES),
  notes: documentTextInput,
  purchaseDate: z.iso.date(),
  vendorPartyId: z.uuid(),
  vendorReferenceNumber: shortTextInput
};

export const CreatePurchaseDocumentDraftInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend(purchaseDocumentDraftInputShape).strict()
);
export type CreatePurchaseDocumentDraftInput = z.infer<
  typeof CreatePurchaseDocumentDraftInputSchema
>;

export const CreateAndPostPurchaseDocumentInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend(purchaseDocumentDraftInputShape).strict()
);
export type CreateAndPostPurchaseDocumentInput = z.infer<
  typeof CreateAndPostPurchaseDocumentInputSchema
>;

export const UpdatePurchaseDocumentDraftInputSchema = withTradeDocumentChecks(
  OrgSlugInputSchema.extend({
    ...purchaseDocumentDraftInputShape,
    documentId: z.uuid()
  }).strict()
);
export type UpdatePurchaseDocumentDraftInput = z.infer<
  typeof UpdatePurchaseDocumentDraftInputSchema
>;

export const SettlementAllocationInputSchema = z
  .object({
    amountMinor: PositiveMinorUnitStringSchema,
    targetDocumentId: z.uuid(),
    targetDocumentKind: AllocatableDocumentKindSchema
  })
  .strict();
export type SettlementAllocationInput = z.infer<typeof SettlementAllocationInputSchema>;

const settlementAllocationsInputSchema = z.array(SettlementAllocationInputSchema).min(1);

const settlementDraftInputShape = {
  allocations: settlementAllocationsInputSchema,
  amountMinor: PositiveMinorUnitStringSchema,
  cashAccountId: z.uuid(),
  direction: SettlementDirectionSchema,
  notes: documentTextInput,
  partyId: z.uuid(),
  paymentMode: PaymentModeSchema,
  reference: shortTextInput,
  settlementDate: z.iso.date()
};

type SettlementDraftInput = {
  allocations: ReadonlyArray<{ amountMinor: string; targetDocumentId: string }>;
  amountMinor: string;
};

function withSettlementChecks<T extends z.ZodType<SettlementDraftInput>>(schema: T) {
  return schema
    .refine(settlementIsFullyAllocated, {
      message: "Settlement allocations must equal the settlement amount",
      path: ["allocations"]
    })
    .refine(settlementAllocationTargetsAreUnique, {
      message: "Settlement allocations must target each document once",
      path: ["allocations"]
    });
}

export const CreateSettlementDraftInputSchema = withSettlementChecks(
  OrgSlugInputSchema.extend(settlementDraftInputShape).strict()
);
export type CreateSettlementDraftInput = z.infer<typeof CreateSettlementDraftInputSchema>;

export const CreateAndPostSettlementInputSchema = withSettlementChecks(
  OrgSlugInputSchema.extend(settlementDraftInputShape).strict()
);
export type CreateAndPostSettlementInput = z.infer<typeof CreateAndPostSettlementInputSchema>;

export const UpdateSettlementDraftInputSchema = withSettlementChecks(
  OrgSlugInputSchema.extend({
    ...settlementDraftInputShape,
    documentId: z.uuid()
  }).strict()
);
export type UpdateSettlementDraftInput = z.infer<typeof UpdateSettlementDraftInputSchema>;

const documentIdInputShape = {
  documentId: z.uuid()
};

const voidInputShape = {
  ...documentIdInputShape,
  reason: z.string().trim().min(1).max(500),
  voidDate: z.iso.date()
};

export const GetSalesDocumentInputSchema = OrgSlugInputSchema.extend(documentIdInputShape).strict();
export type GetSalesDocumentInput = z.infer<typeof GetSalesDocumentInputSchema>;

export const GetPurchaseDocumentInputSchema =
  OrgSlugInputSchema.extend(documentIdInputShape).strict();
export type GetPurchaseDocumentInput = z.infer<typeof GetPurchaseDocumentInputSchema>;

export const GetSettlementInputSchema = OrgSlugInputSchema.extend(documentIdInputShape).strict();
export type GetSettlementInput = z.infer<typeof GetSettlementInputSchema>;

export const VoidSalesDocumentInputSchema = OrgSlugInputSchema.extend(voidInputShape).strict();
export type VoidSalesDocumentInput = z.infer<typeof VoidSalesDocumentInputSchema>;

export const VoidPurchaseDocumentInputSchema = OrgSlugInputSchema.extend({
  ...voidInputShape,
  documentKind: PurchaseDocumentKindSchema
}).strict();
export type VoidPurchaseDocumentInput = z.infer<typeof VoidPurchaseDocumentInputSchema>;

export const VoidSettlementInputSchema = OrgSlugInputSchema.extend(voidInputShape).strict();
export type VoidSettlementInput = z.infer<typeof VoidSettlementInputSchema>;

const documentListFilterShape = {
  ...CursorPaginationInputSchema.shape,
  status: DocumentStatusSchema.optional()
};

export const ListSalesDocumentsInputSchema =
  OrgSlugInputSchema.extend(documentListFilterShape).strict();
export type ListSalesDocumentsInput = z.infer<typeof ListSalesDocumentsInputSchema>;

export const ListPurchaseDocumentsInputSchema = OrgSlugInputSchema.extend({
  ...documentListFilterShape,
  documentKind: PurchaseDocumentKindSchema.optional()
}).strict();
export type ListPurchaseDocumentsInput = z.infer<typeof ListPurchaseDocumentsInputSchema>;

export const ListSettlementsInputSchema = OrgSlugInputSchema.extend({
  ...documentListFilterShape,
  direction: SettlementDirectionSchema.optional()
}).strict();
export type ListSettlementsInput = z.infer<typeof ListSettlementsInputSchema>;

export const DocumentRegisterItemSchema = z
  .object({
    createdAt: z.iso.datetime(),
    documentDate: z.iso.date(),
    documentKind: DocumentKindSchema,
    documentNumber: DocumentNumberSchema.nullable(),
    draftReference: DocumentDraftReferenceSchema,
    id: z.uuid(),
    outstandingMinor: NonNegativeMinorUnitStringSchema.nullable(),
    partyId: z.uuid(),
    status: DocumentStatusSchema,
    totalMinor: NonNegativeMinorUnitStringSchema
  })
  .strict();
export type DocumentRegisterItem = z.infer<typeof DocumentRegisterItemSchema>;

export const ListDocumentsOutputSchema = z
  .object({
    documents: z.array(DocumentRegisterItemSchema),
    nextCursor: CursorPaginationOutputSchema.shape.nextCursor
  })
  .strict();
export type ListDocumentsOutput = z.infer<typeof ListDocumentsOutputSchema>;

export const ListAllocationTargetsInputSchema = OrgSlugInputSchema.extend({
  ...CursorPaginationInputSchema.shape,
  direction: SettlementDirectionSchema,
  partyId: z.uuid()
}).strict();
export type ListAllocationTargetsInput = z.infer<typeof ListAllocationTargetsInputSchema>;

export const AllocationTargetSchema = z
  .object({
    documentDate: z.iso.date(),
    documentKind: AllocatableDocumentKindSchema,
    documentNumber: DocumentNumberSchema,
    id: z.uuid(),
    outstandingMinor: NonNegativeMinorUnitStringSchema,
    totalMinor: NonNegativeMinorUnitStringSchema
  })
  .strict();
export type AllocationTarget = z.infer<typeof AllocationTargetSchema>;

export const ListAllocationTargetsOutputSchema = z
  .object({
    nextCursor: CursorPaginationOutputSchema.shape.nextCursor,
    targets: z.array(AllocationTargetSchema)
  })
  .strict();
export type ListAllocationTargetsOutput = z.infer<typeof ListAllocationTargetsOutputSchema>;

export const SalesDocumentLineSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    hsnCode: z.string().nullable(),
    id: z.uuid(),
    incomeAccountId: z.uuid(),
    itemId: z.uuid().nullable(),
    quantity: QuantityDecimalStringSchema,
    rateMinor: NonNegativeMinorUnitStringSchema,
    totalMinor: NonNegativeMinorUnitStringSchema,
    unit: z.string().nullable()
  })
  .strict();
export type SalesDocumentLine = z.infer<typeof SalesDocumentLineSchema>;

export const PurchaseDocumentLineSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    expenseAccountId: z.uuid(),
    hsnCode: z.string().nullable(),
    id: z.uuid(),
    itemId: z.uuid().nullable(),
    quantity: QuantityDecimalStringSchema,
    rateMinor: NonNegativeMinorUnitStringSchema,
    totalMinor: NonNegativeMinorUnitStringSchema,
    unit: z.string().nullable()
  })
  .strict();
export type PurchaseDocumentLine = z.infer<typeof PurchaseDocumentLineSchema>;

export const SalesDocumentSchema = DocumentLifecycleSchema.extend({
  customerPartyId: z.uuid(),
  customerPartyName: z.string().optional(),
  documentKind: z.literal("sales_invoice"),
  dueDate: z.iso.date().nullable(),
  invoiceDate: z.iso.date(),
  lines: z.array(SalesDocumentLineSchema),
  notes: z.string().nullable(),
  outstandingMinor: NonNegativeMinorUnitStringSchema,
  terms: z.string().nullable(),
  totalMinor: NonNegativeMinorUnitStringSchema
}).strict();
export type SalesDocument = z.infer<typeof SalesDocumentSchema>;

export const PurchaseDocumentSchema = DocumentLifecycleSchema.extend({
  documentKind: PurchaseDocumentKindSchema,
  dueDate: z.iso.date().nullable(),
  lines: z.array(PurchaseDocumentLineSchema),
  notes: z.string().nullable(),
  outstandingMinor: NonNegativeMinorUnitStringSchema,
  purchaseDate: z.iso.date(),
  totalMinor: NonNegativeMinorUnitStringSchema,
  vendorPartyId: z.uuid(),
  vendorPartyName: z.string().optional(),
  vendorReferenceNumber: z.string().nullable()
}).strict();
export type PurchaseDocument = z.infer<typeof PurchaseDocumentSchema>;

export const SettlementAllocationSchema = z
  .object({
    amountMinor: NonNegativeMinorUnitStringSchema,
    id: z.uuid(),
    targetDocumentId: z.uuid(),
    targetDocumentKind: AllocatableDocumentKindSchema,
    targetDocumentNumber: z.string().nullable()
  })
  .strict();
export type SettlementAllocation = z.infer<typeof SettlementAllocationSchema>;

export const SettlementDocumentSchema = DocumentLifecycleSchema.extend({
  allocations: z.array(SettlementAllocationSchema),
  amountMinor: NonNegativeMinorUnitStringSchema,
  cashAccountId: z.uuid(),
  direction: SettlementDirectionSchema,
  documentKind: z.literal("settlement"),
  notes: z.string().nullable(),
  partyId: z.uuid(),
  partyName: z.string().optional(),
  paymentMode: PaymentModeSchema,
  reference: z.string().nullable(),
  settlementDate: z.iso.date()
}).strict();
export type SettlementDocument = z.infer<typeof SettlementDocumentSchema>;

export const DocumentDetailSchema = z.union([
  SalesDocumentSchema,
  PurchaseDocumentSchema,
  SettlementDocumentSchema
]);
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>;

export const PostedDocumentSchema = z
  .object({
    documentId: z.uuid(),
    documentKind: DocumentKindSchema,
    documentNumber: DocumentNumberSchema,
    journalEntryId: z.uuid()
  })
  .strict();
export type PostedDocument = z.infer<typeof PostedDocumentSchema>;

export const VoidedDocumentSchema = z
  .object({
    documentId: z.uuid(),
    documentKind: DocumentKindSchema,
    documentNumber: DocumentNumberSchema,
    journalEntryId: z.uuid(),
    reversalJournalEntryId: z.uuid()
  })
  .strict();
export type VoidedDocument = z.infer<typeof VoidedDocumentSchema>;
