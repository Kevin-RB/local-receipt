"use client";

import { Loader2Icon } from "lucide-react";

import {
  ReceiptCard,
  receiptPayloadToCardItems,
  receiptRowToCardItems,
} from "@/components/receipt-card";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";
import type { ProcessingStatus } from "@/lib/db";

const statusStyles: Record<ProcessingStatus, string> = {
  done: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  uploading: "bg-gray-100 text-gray-800",
};

const StatusBadge = ({ status }: { status: ProcessingStatus }) => (
  <span
    className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${statusStyles[status]}`}
  >
    {status}
  </span>
);

interface ReceiptRow {
  id: string;
  merchant?: { name: string } | null;
  payment?: { method?: string } | null;
  receiptItems?: { id: string; lineTotal: string; name: string }[];
  status: ProcessingStatus;
  totals?: { total: number } | null;
  transaction?: { datetime?: string; receipt_number?: string } | null;
}

const LiveReceiptRow = ({ receiptId }: { receiptId: string }) => {
  const { failureReason, receipt, state } = useReceiptRealtime({
    enabled: true,
    receiptId,
  });

  if (state === "complete" && receipt) {
    return (
      <li>
        <ReceiptCard
          hasIntegrityWarning={receipt.hasIntegrityWarning}
          items={receiptPayloadToCardItems(receipt)}
          merchantName={receipt.merchant.name}
          paymentMethod={receipt.payment.method}
          receiptNumber={receipt.receiptNumber}
          total={receipt.totals.total}
          transactionDateTime={receipt.transactionDateTime}
        />
        <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
          done
        </span>
      </li>
    );
  }

  return (
    <li className="border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Loader2Icon className="size-4 animate-spin text-blue-600" />
        <span className="text-sm text-muted-foreground">
          {state ?? "processing"}...
        </span>
      </div>
      {failureReason && (
        <p className="mt-2 text-sm text-red-600">{failureReason}</p>
      )}
      <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
        {state ?? "connecting"}
      </span>
    </li>
  );
};

const TERMINAL_STATUSES = new Set<ProcessingStatus>(["done", "error"]);

export const ReceiptsList = ({ receipts }: { receipts: ReceiptRow[] }) => (
  <ul className="mt-6 space-y-4">
    {receipts.map((receipt) => {
      if (!TERMINAL_STATUSES.has(receipt.status)) {
        return <LiveReceiptRow key={receipt.id} receiptId={receipt.id} />;
      }

      return (
        <li key={receipt.id}>
          <ReceiptCard
            items={
              receipt.receiptItems
                ? receiptRowToCardItems(receipt.receiptItems)
                : []
            }
            merchantName={receipt.merchant?.name ?? "New receipt"}
            paymentMethod={receipt.payment?.method}
            receiptNumber={receipt.transaction?.receipt_number}
            total={receipt.totals?.total ?? 0}
            transactionDateTime={receipt.transaction?.datetime}
          />
          <StatusBadge status={receipt.status} />
        </li>
      );
    })}
  </ul>
);
