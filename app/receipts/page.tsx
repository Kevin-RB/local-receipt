import { listReceipts } from "@/lib/db";
import type { ProcessingStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export default async function ReceiptsPage() {
  const receipts = await listReceipts();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Receipts</h1>
      <p className="text-muted-foreground mt-2">
        {receipts.length === 0
          ? "No receipts"
          : `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`}{" "}
        in the database.
      </p>
      {receipts.length === 0 ? (
        <p className="text-muted-foreground mt-6">No receipts found.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="border rounded-lg p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {receipt.merchant?.name ?? "New receipt"}
                </h2>
                <span className="text-muted-foreground text-sm">
                  #{receipt.id}
                </span>
              </div>
              {receipt.transaction?.receipt_number && (
                <p className="text-muted-foreground text-sm">
                  Receipt {receipt.transaction.receipt_number}
                </p>
              )}
              {receipt.transaction?.datetime && (
                <p className="text-muted-foreground text-sm">
                  {receipt.transaction.datetime}
                </p>
              )}
              {receipt.items && receipt.items.length > 0 && (
                <div className="mt-2 text-sm">
                  {receipt.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {receipt.totals && (
                <div className="mt-2 border-t pt-2 text-sm font-medium flex justify-between">
                  <span>Total</span>
                  <span>${receipt.totals.total.toFixed(2)}</span>
                </div>
              )}
              {receipt.payment?.method && (
                <p className="text-muted-foreground mt-1 text-sm">
                  Paid via {receipt.payment.method}
                </p>
              )}
              <StatusBadge status={receipt.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
