import { type JournalSourceType } from "@tsu-stack/core/accounting";
import {
  type CreateAndPostPurchaseDocumentInput,
  type CreateAndPostSalesDocumentInput,
  type CreateAndPostSettlementInput,
  type CreateSalesDocumentDraftInput,
  type CreatePurchaseDocumentDraftInput,
  type CreateSettlementDraftInput,
  type GetPurchaseDocumentInput,
  type GetSalesDocumentInput,
  type GetSettlementInput,
  type ListAllocationTargetsInput,
  type ListPurchaseDocumentsInput,
  type ListSalesDocumentsInput,
  type ListSettlementsInput,
  type UpdatePurchaseDocumentDraftInput,
  type UpdateSalesDocumentDraftInput,
  type UpdateSettlementDraftInput,
  type VoidPurchaseDocumentInput,
  type VoidSalesDocumentInput,
  type VoidSettlementInput
} from "@tsu-stack/core/documents";

export type OrganizationScopedInput = {
  organizationId: string;
  userId: string;
};

export type CreateSalesDocumentDraftDbInput = Omit<CreateSalesDocumentDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type CreatePurchaseDocumentDraftDbInput = Omit<CreatePurchaseDocumentDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type CreateSettlementDraftDbInput = Omit<CreateSettlementDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type CreateAndPostSalesDocumentDbInput = Omit<CreateAndPostSalesDocumentInput, "orgSlug"> &
  OrganizationScopedInput;
export type CreateAndPostPurchaseDocumentDbInput = Omit<
  CreateAndPostPurchaseDocumentInput,
  "orgSlug"
> &
  OrganizationScopedInput;
export type CreateAndPostSettlementDbInput = Omit<CreateAndPostSettlementInput, "orgSlug"> &
  OrganizationScopedInput;
export type UpdateSalesDocumentDraftDbInput = Omit<UpdateSalesDocumentDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type UpdatePurchaseDocumentDraftDbInput = Omit<UpdatePurchaseDocumentDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type UpdateSettlementDraftDbInput = Omit<UpdateSettlementDraftInput, "orgSlug"> &
  OrganizationScopedInput;
export type UpdateAndPostSalesDocumentDbInput = UpdateSalesDocumentDraftDbInput;
export type UpdateAndPostPurchaseDocumentDbInput = UpdatePurchaseDocumentDraftDbInput;
export type UpdateAndPostSettlementDbInput = UpdateSettlementDraftDbInput;
export type VoidSalesDocumentDbInput = Omit<VoidSalesDocumentInput, "orgSlug"> &
  OrganizationScopedInput;
export type VoidPurchaseDocumentDbInput = Omit<VoidPurchaseDocumentInput, "orgSlug"> &
  OrganizationScopedInput;
export type VoidSettlementDbInput = Omit<VoidSettlementInput, "orgSlug"> & OrganizationScopedInput;
export type ListSalesDocumentsDbInput = Omit<ListSalesDocumentsInput, "limit" | "orgSlug"> & {
  limit?: number;
  organizationId: string;
};
export type ListPurchaseDocumentsDbInput = Omit<ListPurchaseDocumentsInput, "limit" | "orgSlug"> & {
  limit?: number;
  organizationId: string;
};
export type ListSettlementsDbInput = Omit<ListSettlementsInput, "limit" | "orgSlug"> & {
  limit?: number;
  organizationId: string;
};
export type ListAllocationTargetsDbInput = Omit<ListAllocationTargetsInput, "limit" | "orgSlug"> & {
  limit?: number;
  organizationId: string;
};
export type GetSalesDocumentDbInput = Omit<GetSalesDocumentInput, "orgSlug"> & {
  organizationId: string;
};
export type GetPurchaseDocumentDbInput = Omit<GetPurchaseDocumentInput, "orgSlug"> & {
  organizationId: string;
};
export type GetSettlementDbInput = Omit<GetSettlementInput, "orgSlug"> & {
  organizationId: string;
};

export type PostingPeriod = {
  fiscalYearId: string;
  fiscalYearName: string;
  periodId: string;
};

export type SequenceAllocation = {
  documentNumber: string;
  sequenceValue: string;
};

export type DocumentSequenceType = JournalSourceType;
