import z from "zod";

import { IntegrityChart } from "@/components/overview/integrity-chart";
import { MerchantSpendingChart } from "@/components/overview/merchant-spending-chart";
import { SpendingChart } from "@/components/overview/spending-chart";
import { listDoneReceipts } from "@/lib/db";
import { receiptSelectSchema } from "@/lib/db/schema/receipt";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";

const getReceipts = async (): Promise<ReceiptSelect[]> => {
  const receipts = await listDoneReceipts();
  const parsed = receiptSelectSchema.array().safeParse(receipts);
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
  }
  return parsed.data;
};

export default async function OverviewPage() {
  const receipts = await getReceipts();

  return (
    <main className="container mx-auto flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <SpendingChart
        receipts={receipts.map(({ total, transactionDateTime }) => ({
          total,
          transactionDateTime,
        }))}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MerchantSpendingChart
          receipts={receipts.map(
            ({ total, transactionDateTime, merchantName }) => ({
              merchantName,
              total,
              transactionDateTime,
            })
          )}
        />
        <IntegrityChart
          receipts={receipts.map(({ hasIntegrityWarning }) => ({
            hasIntegrityWarning,
          }))}
        />
      </div>
    </main>
  );
}
