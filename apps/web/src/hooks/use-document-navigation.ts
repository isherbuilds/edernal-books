import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";

export function useDocumentNavigation(orgSlug: string) {
  const navigate = useNavigate();

  return {
    purchaseBill: (documentId: string) =>
      navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/purchase/bills/$documentId" }),
    purchasePayment: (documentId: string) =>
      navigate({
        params: { documentId, orgSlug },
        to: "/$orgSlug/purchase/payments/$documentId"
      }),
    salesInvoice: (documentId: string) =>
      navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/sales/invoices/$documentId" }),
    salesReceipt: (documentId: string) =>
      navigate({ params: { documentId, orgSlug }, to: "/$orgSlug/sales/receipts/$documentId" })
  };
}
