import { BanIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type DocumentDetail } from "@tsu-stack/core/documents";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import {
  formatMinorUnits,
  getTodayDateString,
  minorUnitsToDecimalString
} from "@/utils/accounting-format";

import { documentStatusLabel, useVoidDocumentMutation } from "@/hooks/use-documents";

import { PageHeader, PageLayout } from "@/components/page-layout";

type DocumentDetailProps = {
  detail: DocumentDetail;
  onVoided: () => void;
  orgSlug: string;
};

function documentTitle(detail: DocumentDetail): string {
  switch (detail.documentKind) {
    case "sales_invoice":
      return "Invoice";
    case "purchase_bill":
      return "Bill";
    case "expense":
      return "Expense";
    case "settlement":
      return detail.direction === "received" ? "Receipt" : "Payment";
  }
}

function documentPartyName(detail: DocumentDetail): string {
  switch (detail.documentKind) {
    case "sales_invoice":
      return detail.customerPartyName ?? detail.customerPartyId;
    case "purchase_bill":
    case "expense":
      return detail.vendorPartyName ?? detail.vendorPartyId;
    case "settlement":
      return detail.partyName ?? detail.partyId;
  }
}

export function DocumentDetail({ detail, onVoided, orgSlug }: DocumentDetailProps) {
  const voidDocument = useVoidDocumentMutation(orgSlug);
  const [isVoiding, setIsVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [voidDate, setVoidDate] = useState(getTodayDateString());

  const partyName = documentPartyName(detail);
  const title = documentTitle(detail);

  const confirmVoid = () => {
    if (reason.trim() === "") {
      toast.error("Add a reason for voiding");
      return;
    }

    voidDocument.mutate(
      {
        documentId: detail.id,
        documentKind: detail.documentKind,
        orgSlug,
        reason: reason.trim(),
        voidDate
      },
      {
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Could not void document"),
        onSuccess: () => {
          toast.success(`${title} voided`);
          setIsVoiding(false);
          onVoided();
        }
      }
    );
  };

  return (
    <PageLayout>
      <PageHeader
        actions={
          detail.status === "posted" ? (
            <Button onClick={() => setIsVoiding(true)} variant="outline">
              <BanIcon data-icon="inline-start" />
              Void
            </Button>
          ) : null
        }
        description={`${partyName} · ${documentStatusLabel(detail.status)}`}
        title={`${title} ${detail.documentNumber ?? detail.draftReference}`}
      />

      {detail.status === "voided" && detail.voidReason ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <span className="font-medium text-destructive">Voided.</span> {detail.voidReason}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <DetailField label="Status" value={documentStatusLabel(detail.status)} />
        <DetailField label="Number" value={detail.documentNumber ?? detail.draftReference} />
        {detail.documentKind === "sales_invoice" ? (
          <>
            <DetailField label="Customer" value={partyName} />
            <DetailField label="Invoice date" value={detail.invoiceDate} />
            {detail.dueDate ? <DetailField label="Due date" value={detail.dueDate} /> : null}
          </>
        ) : null}
        {detail.documentKind === "purchase_bill" || detail.documentKind === "expense" ? (
          <>
            <DetailField label="Vendor" value={partyName} />
            <DetailField label="Bill date" value={detail.purchaseDate} />
            {detail.vendorReferenceNumber ? (
              <DetailField label="Vendor reference" value={detail.vendorReferenceNumber} />
            ) : null}
          </>
        ) : null}
        {detail.documentKind === "settlement" ? (
          <>
            <DetailField label="Party" value={partyName} />
            <DetailField label="Date" value={detail.settlementDate} />
            <DetailField label="Payment mode" value={detail.paymentMode} />
            <DetailField amount label="Amount" value={formatMinorUnits(detail.amountMinor)} />
          </>
        ) : null}
      </div>

      {detail.documentKind === "sales_invoice" ||
      detail.documentKind === "purchase_bill" ||
      detail.documentKind === "expense" ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Line items</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr className="border-t" key={line.id}>
                    <td className="px-3 py-2">{line.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="font-amount px-3 py-2 text-right tabular-nums">
                      {minorUnitsToDecimalString(line.rateMinor)}
                    </td>
                    <td className="font-amount px-3 py-2 text-right tabular-nums">
                      {formatMinorUnits(line.totalMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-6 px-3 text-sm">
            <span className="text-muted-foreground">
              Outstanding{" "}
              <span className="font-amount tabular-nums">
                {formatMinorUnits(detail.outstandingMinor)}
              </span>
            </span>
            <span>
              Total{" "}
              <span className="font-amount tabular-nums">
                {formatMinorUnits(detail.totalMinor)}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {detail.documentKind === "settlement" && detail.allocations.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Allocations</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <tbody>
                {detail.allocations.map((allocation) => (
                  <tr className="border-t first:border-t-0" key={allocation.id}>
                    <td className="px-3 py-2">
                      {allocation.targetDocumentNumber ?? allocation.targetDocumentId}
                    </td>
                    <td className="font-amount px-3 py-2 text-right tabular-nums">
                      {formatMinorUnits(allocation.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {detail.journalEntryId ? (
        <div className="text-xs text-muted-foreground">
          Journal entry <span className="font-mono">{detail.journalEntryId}</span>
        </div>
      ) : null}

      <Sheet onOpenChange={setIsVoiding} open={isVoiding}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Void {title.toLowerCase()}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="void-reason">Reason</Label>
              <Input
                id="void-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why is this being voided?"
                value={reason}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="void-date">Void date</Label>
              <Input
                id="void-date"
                onChange={(event) => setVoidDate(event.target.value)}
                type="date"
                value={voidDate}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={voidDocument.isPending}
              onClick={confirmVoid}
              type="button"
              variant="destructive"
            >
              {voidDocument.isPending ? <Spinner data-icon="inline-start" /> : null}
              Void {title.toLowerCase()}
            </Button>
            <Button onClick={() => setIsVoiding(false)} type="button" variant="ghost">
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}

function DetailField({ amount, label, value }: { amount?: boolean; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={amount ? "font-amount text-sm tabular-nums" : "text-sm"}>{value}</span>
    </div>
  );
}
