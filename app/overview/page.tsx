import z from "zod";

import { DailySpendingChart } from "@/components/overview/daily-spending-chart";
import { listDoneReceipts } from "@/lib/db";
import { receiptSelectSchema } from "@/lib/db/schema/receipt";
import { sumDailySpending } from "@/lib/overview";

const getSpendingData = async () => {
  const receipts = await listDoneReceipts();
  const parsed = receiptSelectSchema.array().safeParse(receipts);
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
  }
  return sumDailySpending(parsed.data);
};

export default async function OverviewPage() {
  const spending = await getSpendingData();
  return (
    <main className="container mx-auto flex min-h-svh flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <DailySpendingChart data={spending} />
    </main>
  );
}
