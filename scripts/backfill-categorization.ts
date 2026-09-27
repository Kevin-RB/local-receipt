import { and, eq, isNull } from "drizzle-orm";

import { db, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { receiptExtractedEvent } from "@/lib/inngest/functions/categorize-receipt";

const SEND_BATCH_SIZE = 100;

const main = async () => {
  const pending = await db
    .select({ id: receipts.id, userId: receipts.userId })
    .from(receipts)
    .where(and(eq(receipts.status, "done"), isNull(receipts.categorizedAt)));

  if (pending.length === 0) {
    process.stdout.write("No receipts need categorization.\n");
    return;
  }

  const batches: (typeof pending)[] = [];
  for (let index = 0; index < pending.length; index += SEND_BATCH_SIZE) {
    batches.push(pending.slice(index, index + SEND_BATCH_SIZE));
  }

  await Promise.all(
    batches.map((batch) =>
      inngest.send(
        batch.map((receipt) =>
          receiptExtractedEvent.create({
            receiptId: receipt.id,
            userId: receipt.userId,
          })
        )
      )
    )
  );

  process.stdout.write(
    `Queued categorization for ${pending.length} receipt(s).\n`
  );
};

await main();
await db.$client.end();
