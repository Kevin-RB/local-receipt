import type { ReceiptPayload } from "@/lib/inngest/channels";

interface ReceiptCardItem {
  key: string;
  name: string;
  lineTotal: string;
}

export const ReceiptCard = ({
  hasIntegrityWarning,
  items,
  merchantName,
  paymentMethod,
  receiptNumber,
  transactionDateTime,
  total,
}: {
  hasIntegrityWarning?: boolean;
  items: ReceiptCardItem[];
  merchantName: string;
  paymentMethod?: string;
  receiptNumber?: string;
  total: number;
  transactionDateTime?: string;
}) => (
  <div className="border rounded-lg p-4">
    <div className="flex items-baseline justify-between">
      <h2 className="font-semibold">{merchantName || "Receipt"}</h2>
      {receiptNumber && (
        <span className="text-muted-foreground text-sm">#{receiptNumber}</span>
      )}
    </div>
    {transactionDateTime && (
      <p className="text-muted-foreground text-sm">{transactionDateTime}</p>
    )}
    {items.length > 0 && (
      <div className="mt-2 text-sm">
        {items.map((item) => (
          <div key={item.key} className="flex justify-between">
            <span>{item.name}</span>
            <span>${item.lineTotal}</span>
          </div>
        ))}
      </div>
    )}
    <div className="mt-2 border-t pt-2 text-sm font-medium flex justify-between">
      <span>Total</span>
      <span>${total.toFixed(2)}</span>
    </div>
    {paymentMethod && (
      <p className="text-muted-foreground mt-1 text-sm">
        Paid via {paymentMethod}
      </p>
    )}
    {hasIntegrityWarning && (
      <p className="text-yellow-600 mt-1 text-xs">
        Line items may not add up to total
      </p>
    )}
  </div>
);

export const receiptPayloadToCardItems = (
  receipt: ReceiptPayload
): ReceiptCardItem[] =>
  receipt.items.map((item, i) => ({
    key: `${i}-${item.name}-${item.line_total}`,
    lineTotal: item.line_total.toFixed(2),
    name: item.name,
  }));

export const receiptRowToCardItems = (
  items: {
    id: string;
    lineTotal: string;
    name: string;
  }[]
): ReceiptCardItem[] =>
  items.map((item) => ({
    key: item.id,
    lineTotal: Number(item.lineTotal).toFixed(2),
    name: item.name,
  }));
