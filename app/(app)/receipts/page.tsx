import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { receiptColumns } from "@/components/receipts/columns";
import type { ReceiptTable } from "@/components/receipts/columns";
import { DataTable } from "@/components/receipts/table";
import { UploadFlow } from "@/components/upload-flow";
import { auth } from "@/lib/auth";
import { listReceipts } from "@/lib/db";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";
import { receiptSelectSchema } from "@/lib/db/schema/receipt";

const normalizeReceipt = (receipt: ReceiptSelect): ReceiptTable => ({
  hasIntegrityWarning: receipt.hasIntegrityWarning,
  id: receipt.id,
  merchantName: receipt.merchantName ?? "Unknown",
  paymentMethod: receipt.paymentMethod ?? "-",
  status: receipt.status as ReceiptTable["status"],
  total: receipt.total ?? 0,
  transactionDateTime: receipt.transactionDateTime ?? receipt.createdAt,
});

const getReceiptData = async (ownerId: string): Promise<ReceiptTable[]> => {
  const receipts = await listReceipts(ownerId);
  const parsed = receiptSelectSchema.array().safeParse(receipts);
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
  }
  const normalizedReceipts = parsed.data.map(normalizeReceipt);
  return normalizedReceipts;
};

const ReceiptsPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const receipts = await getReceiptData(session.user.id);

  return (
    <main className="container mx-auto flex flex-col gap-6 p-6">
      {/* The visible heading is the table's own; this one exists for screen
          readers and the document title. The greeting now lives on the chat,
          which is the front door. */}
      <h1 className="sr-only">Receipts</h1>
      <div className="flex justify-center">
        <UploadFlow />
      </div>
      <section className="mx-auto w-full">
        <DataTable columns={receiptColumns} data={receipts} />
      </section>
    </main>
  );
};

export default ReceiptsPage;
