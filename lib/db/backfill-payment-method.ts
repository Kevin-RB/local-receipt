import { eq } from "drizzle-orm";

import { db, receipts } from "@/lib/db";
import { normalizePaymentMethod } from "@/lib/receipt/payment-method";

const doneReceipts = await db
  .select({ id: receipts.id, payment: receipts.payment })
  .from(receipts)
  .where(eq(receipts.status, "done"));

const changedCount = await Promise.all(
  doneReceipts.map(async (receipt) => {
    const method = normalizePaymentMethod(receipt.payment);
    if (receipt.payment?.method === method) {
      return false;
    }
    await db
      .update(receipts)
      .set({ payment: { method } })
      .where(eq(receipts.id, receipt.id));
    return true;
  })
).then((results) => results.filter(Boolean).length);

process.stdout.write(
  `Backfilled payment method on ${changedCount} of ${doneReceipts.length} done receipt(s)\n`
);
process.exit(0);
