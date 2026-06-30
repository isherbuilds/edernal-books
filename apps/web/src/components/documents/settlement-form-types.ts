import { type PAYMENT_MODES, type AllocationTarget } from "@tsu-stack/core/documents";

export type AllocationTargetInfo = {
  documentKind: AllocationTarget["documentKind"];
  documentDate?: string;
  documentNumber?: string;
  outstandingMinor?: string;
  unavailable?: boolean;
};

export type DisplayedAllocationTarget = AllocationTargetInfo & {
  id: string;
};

export type SettlementFormOption = {
  label: string;
  value: string;
};

export type SettlementFormValues = {
  amount: string;
  cashAccountId: string;
  notes: string;
  partyId: string;
  paymentMode: (typeof PAYMENT_MODES)[number];
  reference: string;
  settlementDate: string;
};
