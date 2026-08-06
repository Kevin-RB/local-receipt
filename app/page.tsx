import z from "zod";

import { receiptColumns } from "@/app/columns";
import type { ReceiptTable } from "@/app/columns";
import { DataTable } from "@/app/data-table";
import { UploadFlow } from "@/components/upload-flow";
import { listReceipts } from "@/lib/db";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";
import { receiptSelectSchema } from "@/lib/db/schema/receipt";

const normalizeReceipt = (receipt: ReceiptSelect): ReceiptTable => ({
  hasIntegrityWarning: receipt.hasIntegrityWarning,
  id: receipt.id,
  merchantName: receipt.merchantName ?? receipt.merchant?.name ?? "Unknown",
  paymentMethod: receipt.payment?.method ?? "-",
  receiptNumber: receipt.receiptNumber ?? "-",
  status: receipt.status as ReceiptTable["status"],
  total: receipt.totals?.total ?? 0,
  transactionDateTime: receipt.transactionDateTime ?? receipt.createdAt,
});

const getReceiptData = async (): Promise<ReceiptTable[]> => {
  const receipts = await listReceipts();
  const parsed = receiptSelectSchema.array().safeParse(receipts);
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
  }
  const normalizedReceipts = parsed.data.map(normalizeReceipt);
  return normalizedReceipts;
};

export default async function Home() {
  const receipts = await getReceiptData();

  return (
    <main className="flex min-h-svh flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Possum Receipts</h1>
      <div className="flex justify-center">
        <UploadFlow />
      </div>
      <section className="mx-auto w-full max-w-5xl">
        <h2 className="text-lg font-semibold">Receipts</h2>
        {/* <ReceiptsDataTable receipts={receipts} /> */}
        <DataTable columns={receiptColumns} data={receipts} />
      </section>
    </main>
  );
}
