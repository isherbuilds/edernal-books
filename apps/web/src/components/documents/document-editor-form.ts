import { z } from "zod";

import {
  computeLineTotalMinor,
  MAX_DOCUMENT_LINES,
  QuantityDecimalStringSchema,
  type PurchaseDocumentKind,
  type SalesDocumentLineInput,
  type PurchaseDocumentLineInput
} from "@tsu-stack/core/documents";

import { parseDecimalAmountToMinorUnits } from "@/utils/accounting-format";

const documentLineSchema = z
  .object({
    accountId: z.string().min(1, { message: "Select an account" }),
    description: z.string().trim().min(1, { message: "Add a description" }).max(500),
    hsnCode: z.string(),
    itemId: z.string(),
    quantity: QuantityDecimalStringSchema,
    rate: z
      .string()
      .trim()
      .refine(
        (value) => {
          const parsed = parseDecimalAmountToMinorUnits(value);
          return parsed.ok && parsed.value !== null;
        },
        { message: "Enter a rate" }
      ),
    unit: z.string()
  })
  .superRefine((line, context) => {
    if (lineTotalMinor(line) === 0n) {
      context.addIssue({
        code: "custom",
        message: "Line total must be at least 0.01",
        path: ["rate"]
      });
    }
  });

const documentEditorBaseSchema = z.object({
  documentDate: z.string().min(1, { message: "Pick a date" }),
  dueDate: z.string(),
  lines: z
    .array(documentLineSchema)
    .min(1, { message: "Add at least one line" })
    .max(MAX_DOCUMENT_LINES, { message: "Too many lines" }),
  notes: z.string(),
  partyId: z.string().min(1, { message: "Select a party" })
});

export const salesInvoiceEditorSchema = documentEditorBaseSchema.extend({
  terms: z.string()
});

export const purchaseDocumentEditorSchema = documentEditorBaseSchema.extend({
  documentKind: z.enum(["purchase_bill", "expense"]),
  reference: z.string()
});

export type DocumentLineFormValues = z.infer<typeof documentLineSchema>;
export type DocumentLinesFormValues = { lines: DocumentLineFormValues[] };
export type SalesInvoiceEditorFormValues = z.infer<typeof salesInvoiceEditorSchema>;
export type PurchaseDocumentEditorFormValues = z.infer<typeof purchaseDocumentEditorSchema>;

export function createEmptyLine(): DocumentLineFormValues {
  return {
    accountId: "",
    description: "",
    hsnCode: "",
    itemId: "",
    quantity: "1",
    rate: "",
    unit: ""
  };
}

/** Live, per-line total in minor units; null while the quantity or rate is incomplete. */
export function lineTotalMinor(line: { quantity: string; rate: string }): bigint | null {
  const trimmedQuantity = line.quantity.trim();

  if (!QuantityDecimalStringSchema.safeParse(trimmedQuantity).success) {
    return null;
  }

  const parsedRate = parseDecimalAmountToMinorUnits(line.rate);

  if (!parsedRate.ok || parsedRate.value === null) {
    return null;
  }

  return computeLineTotalMinor(trimmedQuantity, parsedRate.value);
}

export function documentTotalMinor(
  lines: ReadonlyArray<{ quantity: string; rate: string }>
): bigint {
  return lines.reduce((sum, line) => sum + (lineTotalMinor(line) ?? 0n), 0n);
}

function toMinorUnits(rate: string): string {
  const parsed = parseDecimalAmountToMinorUnits(rate);

  if (!parsed.ok || parsed.value === null) {
    throw new Error("Line rate is not a valid amount");
  }

  return parsed.value;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toSalesLineInputs(
  lines: ReadonlyArray<DocumentLineFormValues>
): SalesDocumentLineInput[] {
  return lines.map((line) => {
    return {
      description: line.description.trim(),
      hsnCode: optionalText(line.hsnCode),
      incomeAccountId: line.accountId,
      itemId: line.itemId === "" ? null : line.itemId,
      quantity: line.quantity.trim(),
      rateMinor: toMinorUnits(line.rate),
      unit: optionalText(line.unit)
    };
  });
}

export function toPurchaseLineInputs(
  lines: ReadonlyArray<DocumentLineFormValues>
): PurchaseDocumentLineInput[] {
  return lines.map((line) => {
    return {
      description: line.description.trim(),
      expenseAccountId: line.accountId,
      hsnCode: optionalText(line.hsnCode),
      itemId: line.itemId === "" ? null : line.itemId,
      quantity: line.quantity.trim(),
      rateMinor: toMinorUnits(line.rate),
      unit: optionalText(line.unit)
    };
  });
}

export type PurchaseKindOption = { label: string; value: PurchaseDocumentKind };

export const PURCHASE_KIND_OPTIONS: PurchaseKindOption[] = [
  { label: "Bill", value: "purchase_bill" },
  { label: "Expense", value: "expense" }
];
