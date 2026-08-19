import z from "zod";

import { SpendingChart } from "@/components/overview/spending-chart";
import { listDoneReceipts } from "@/lib/db";
import { receiptSelectSchema } from "@/lib/db/schema/receipt";
import type { SpendingInput } from "@/lib/overview";

const getReceipts = async (): Promise<SpendingInput[]> => {
  const receipts = await listDoneReceipts();
  const parsed = receiptSelectSchema.array().safeParse(receipts);
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
  }
  return parsed.data.map(({ total, transactionDateTime }) => ({
    total,
    transactionDateTime,
  }));
};

export default async function OverviewPage() {
  const receipts = await getReceipts();

  return (
    <main className="container mx-auto flex min-h-svh flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <SpendingChart receipts={receipts} />
    </main>
  );
}
